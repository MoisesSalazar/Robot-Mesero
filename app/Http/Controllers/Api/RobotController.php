<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;

class RobotController extends Controller
{
    private function isSimulation(): bool
    {
        return config('robot.mode', 'simulation') === 'simulation';
    }

    private function esp32(string $path, string $method = 'get', array $payload = []): JsonResponse
    {
        $base = rtrim((string) config('robot.esp32_base_url'), '/');
        $url = $base.$path;
        $timeout = (int) config('robot.timeout', 3);

        try {
            $pending = Http::timeout($timeout)->acceptJson();

            $response = match (strtolower($method)) {
                'post' => $pending->post($url, $payload),
                'put' => $pending->put($url, $payload),
                default => $pending->get($url, $payload),
            };

            if (! $response->successful()) {
                return response()->json([
                    'ok' => false,
                    'mode' => 'real',
                    'error' => 'esp32_http_error',
                    'status' => $response->status(),
                    'body' => $response->json() ?? $response->body(),
                ], 502);
            }

            return response()->json([
                'ok' => true,
                'mode' => 'real',
                'esp32' => $response->json() ?? ['raw' => $response->body()],
            ]);
        } catch (ConnectionException $e) {
            return response()->json([
                'ok' => false,
                'mode' => 'real',
                'error' => 'esp32_unreachable',
                'message' => 'No se pudo conectar con el ESP32 en '.$base,
                'detail' => $e->getMessage(),
            ], 503);
        }
    }

    private function state(): array
    {
        return Cache::get('robot.state', [
            'connection' => 'connected',
            'status' => 'disponible',
            'movement' => 'stop',
            'speed' => 50,
            'destination' => null,
            'qr_target' => null,
            'camera' => false,
            'flashlight' => false,
            'distance_cm' => 72,
            'battery' => 85,
            'emergency' => false,
            'updated_at' => now()->toIso8601String(),
        ]);
    }

    private function saveState(array $patch): array
    {
        $next = array_merge($this->state(), $patch, [
            'updated_at' => now()->toIso8601String(),
        ]);
        Cache::put('robot.state', $next, now()->addHours(6));

        return $next;
    }

    public function estado(): JsonResponse
    {
        if (! $this->isSimulation()) {
            return $this->esp32('/status', 'get');
        }

        $state = $this->state();
        $state['distance_cm'] = max(15, min(120, $state['distance_cm'] + random_int(-4, 4)));
        $this->saveState(['distance_cm' => $state['distance_cm']]);

        return response()->json([
            'ok' => true,
            'mode' => 'simulation',
            'robot' => $state,
        ]);
    }

    public function config(): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'mode' => config('robot.mode'),
            'esp32_base_url' => config('robot.esp32_base_url'),
            'mesas' => config('robot.mesas'),
            'gpio' => [
                'motor_izq_rpwm' => 25,
                'motor_izq_lpwm' => 26,
                'motor_der_rpwm' => 27,
                'motor_der_lpwm' => 33,
                'trig' => 13,
                'echo' => 14,
            ],
        ]);
    }

    public function avanzar(Request $request): JsonResponse
    {
        return $this->manualMove($request, 'forward', 'avanzar');
    }

    public function retroceder(Request $request): JsonResponse
    {
        return $this->manualMove($request, 'backward', 'retroceder');
    }

    public function izquierda(Request $request): JsonResponse
    {
        return $this->manualMove($request, 'left', 'izquierda');
    }

    public function derecha(Request $request): JsonResponse
    {
        return $this->manualMove($request, 'right', 'derecha');
    }

    public function detener(): JsonResponse
    {
        if (! $this->isSimulation()) {
            return $this->esp32('/cmd/stop', 'post', ['cmd' => 'stop']);
        }

        $state = $this->state();
        if ($state['emergency']) {
            return response()->json([
                'ok' => false,
                'error' => 'emergency_active',
                'message' => 'Emergencia activa. Reactiva el robot primero.',
                'robot' => $state,
            ], 423);
        }

        $robot = $this->saveState([
            'movement' => 'stop',
            'status' => 'detenido',
        ]);

        return response()->json([
            'ok' => true,
            'mode' => 'simulation',
            'command' => 'detener',
            'robot' => $robot,
        ]);
    }

    public function velocidad(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'speed' => 'required|integer|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'ok' => false,
                'error' => 'validation',
                'messages' => $validator->errors(),
            ], 422);
        }

        $speed = (int) $request->input('speed');

        if (! $this->isSimulation()) {
            return $this->esp32('/cmd/speed', 'post', [
                'cmd' => 'speed',
                'speed' => $speed,
            ]);
        }

        $robot = $this->saveState(['speed' => $speed]);

        return response()->json([
            'ok' => true,
            'mode' => 'simulation',
            'command' => 'velocidad',
            'robot' => $robot,
        ]);
    }

    private function manualMove(Request $request, string $movement, string $command): JsonResponse
    {
        $speed = (int) $request->input('speed', $this->state()['speed']);

        if (! $this->isSimulation()) {
            return $this->esp32('/cmd/'.$command, 'post', [
                'cmd' => $command,
                'speed' => $speed,
            ]);
        }

        $state = $this->state();

        if ($state['emergency']) {
            return response()->json([
                'ok' => false,
                'error' => 'emergency_active',
                'message' => 'Emergencia activa. Controles bloqueados.',
                'robot' => $state,
            ], 423);
        }

        if ($movement === 'forward' && $state['distance_cm'] < 20) {
            return response()->json([
                'ok' => false,
                'error' => 'obstacle',
                'message' => 'Obstáculo a menos de 20 cm. Avance bloqueado.',
                'robot' => $state,
            ], 409);
        }

        $robot = $this->saveState([
            'movement' => $movement,
            'speed' => max(0, min(100, $speed)),
            'status' => 'en_camino',
        ]);

        return response()->json([
            'ok' => true,
            'mode' => 'simulation',
            'command' => $command,
            'robot' => $robot,
        ]);
    }

    public function gotoMesa(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'mesa' => 'required|integer|min:1|max:4',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'ok' => false,
                'error' => 'validation',
                'messages' => $validator->errors(),
            ], 422);
        }

        $mesa = (int) $request->input('mesa');
        $qr = config('robot.mesas.'.$mesa, 'M'.$mesa);

        if (! $this->isSimulation()) {
            return $this->esp32('/cmd/goto', 'post', [
                'cmd' => 'goto',
                'mesa' => $mesa,
                'qr' => $qr,
            ]);
        }

        $state = $this->state();
        if ($state['emergency']) {
            return response()->json([
                'ok' => false,
                'error' => 'emergency_active',
                'robot' => $state,
            ], 423);
        }

        $robot = $this->saveState([
            'destination' => $mesa,
            'qr_target' => $qr,
            'status' => 'en_camino',
            'movement' => 'forward',
            'camera' => true,
        ]);

        return response()->json([
            'ok' => true,
            'mode' => 'simulation',
            'command' => 'goto',
            'message' => "Buscando QR {$qr} en mesa {$mesa}",
            'robot' => $robot,
        ]);
    }

    public function regresarBase(): JsonResponse
    {
        if (! $this->isSimulation()) {
            return $this->esp32('/cmd/home', 'post', ['cmd' => 'home']);
        }

        $robot = $this->saveState([
            'status' => 'regresando',
            'movement' => 'forward',
            'destination' => null,
            'qr_target' => 'BASE',
        ]);

        return response()->json([
            'ok' => true,
            'mode' => 'simulation',
            'command' => 'regresar-base',
            'robot' => $robot,
        ]);
    }

    public function emergencia(): JsonResponse
    {
        if (! $this->isSimulation()) {
            return $this->esp32('/cmd/emergency', 'post', ['cmd' => 'emergency']);
        }

        $robot = $this->saveState([
            'emergency' => true,
            'movement' => 'stop',
            'speed' => 0,
            'status' => 'emergencia',
        ]);

        return response()->json([
            'ok' => true,
            'mode' => 'simulation',
            'command' => 'emergencia',
            'message' => 'Parada de emergencia activada',
            'robot' => $robot,
        ]);
    }

    public function reactivar(): JsonResponse
    {
        if (! $this->isSimulation()) {
            return $this->esp32('/cmd/resume', 'post', ['cmd' => 'resume']);
        }

        $robot = $this->saveState([
            'emergency' => false,
            'movement' => 'stop',
            'speed' => 50,
            'status' => 'disponible',
        ]);

        return response()->json([
            'ok' => true,
            'mode' => 'simulation',
            'command' => 'reactivar',
            'robot' => $robot,
        ]);
    }

    public function camaraEncender(): JsonResponse
    {
        return $this->toggleBool('camera', true, '/cmd/camera/on', 'camara_on');
    }

    public function camaraApagar(): JsonResponse
    {
        return $this->toggleBool('camera', false, '/cmd/camera/off', 'camara_off');
    }

    public function linternaEncender(): JsonResponse
    {
        return $this->toggleBool('flashlight', true, '/cmd/flash/on', 'linterna_on');
    }

    public function linternaApagar(): JsonResponse
    {
        return $this->toggleBool('flashlight', false, '/cmd/flash/off', 'linterna_off');
    }

    public function distancia(): JsonResponse
    {
        if (! $this->isSimulation()) {
            return $this->esp32('/sensors/distance', 'get');
        }

        $cm = max(12, min(150, $this->state()['distance_cm'] + random_int(-6, 6)));
        $robot = $this->saveState(['distance_cm' => $cm]);
        $level = $cm < 20 ? 'obstaculo' : ($cm <= 50 ? 'precaucion' : 'libre');

        return response()->json([
            'ok' => true,
            'mode' => 'simulation',
            'distance_cm' => $cm,
            'level' => $level,
            'gpio' => ['trig' => 13, 'echo' => 14],
            'robot' => $robot,
        ]);
    }

    private function toggleBool(string $field, bool $value, string $espPath, string $command): JsonResponse
    {
        if (! $this->isSimulation()) {
            return $this->esp32($espPath, 'post', ['cmd' => $command]);
        }

        $robot = $this->saveState([$field => $value]);

        return response()->json([
            'ok' => true,
            'mode' => 'simulation',
            'command' => $command,
            'robot' => $robot,
        ]);
    }
}
