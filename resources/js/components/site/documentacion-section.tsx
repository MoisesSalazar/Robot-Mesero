import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    CircleStop,
    Copy,
    Flashlight,
    Home,
    Play,
    Send,
    ShieldAlert,
    Terminal,
    Wifi,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    robotService,
    type RobotApiResponse,
} from '@/lib/robot-service';
import { cn } from '@/lib/utils';

type ApiDoc = {
    id: string;
    group: string;
    method: 'GET' | 'POST';
    path: string;
    desc: string;
    params: string;
    requestExample: string;
    responseExample: string;
    run: () => Promise<RobotApiResponse>;
};

const docs: ApiDoc[] = [
    {
        id: 'estado',
        group: 'Estado',
        method: 'GET',
        path: '/api/robot/estado',
        desc: 'Consulta estado completo del robot (movimiento, batería, destino QR, emergencia).',
        params: 'Ninguno',
        requestExample: 'GET /api/robot/estado',
        responseExample: `{
  "ok": true,
  "mode": "simulation",
  "robot": {
    "status": "disponible",
    "movement": "stop",
    "speed": 50,
    "distance_cm": 72,
    "battery": 85,
    "qr_target": null
  }
}`,
        run: () => robotService.getEstado(),
    },
    {
        id: 'goto',
        group: 'Automático',
        method: 'POST',
        path: '/api/robot/goto',
        desc: 'Envía al ESP32 la mesa destino. La cámara busca el QR (M1–M4) y navega linealmente.',
        params: 'mesa: integer 1–4',
        requestExample: `{
  "mesa": 2
}`,
        responseExample: `{
  "ok": true,
  "command": "goto",
  "message": "Buscando QR M2 en mesa 2",
  "robot": { "status": "en_camino", "qr_target": "M2" }
}`,
        run: () => robotService.goto(2),
    },
    {
        id: 'avanzar',
        group: 'Manual',
        method: 'POST',
        path: '/api/robot/manual/avanzar',
        desc: 'PWM ambos motores adelante (GPIO 25/26 y 27/33 vía BTS7960). Bloquea si distancia < 20 cm.',
        params: 'speed?: 0–100 (opcional)',
        requestExample: `{ "speed": 50 }`,
        responseExample: `{
  "ok": true,
  "command": "avanzar",
  "robot": { "movement": "forward", "status": "en_camino" }
}`,
        run: () => robotService.avanzar(50),
    },
    {
        id: 'detener',
        group: 'Manual',
        method: 'POST',
        path: '/api/robot/manual/detener',
        desc: 'Detiene motores (RPWM/LPWM en bajo).',
        params: 'Ninguno',
        requestExample: 'POST /api/robot/manual/detener',
        responseExample: `{ "ok": true, "command": "detener", "robot": { "movement": "stop" } }`,
        run: () => robotService.detener(),
    },
    {
        id: 'velocidad',
        group: 'Manual',
        method: 'POST',
        path: '/api/robot/manual/velocidad',
        desc: 'Ajusta duty cycle PWM 0–100%.',
        params: 'speed: integer 0–100',
        requestExample: `{ "speed": 65 }`,
        responseExample: `{ "ok": true, "robot": { "speed": 65 } }`,
        run: () => robotService.velocidad(65),
    },
    {
        id: 'distancia',
        group: 'Sensor',
        method: 'GET',
        path: '/api/robot/sensores/distancia',
        desc: 'Lee HC-SR04 (TRIG GPIO13, ECHO GPIO14 con divisor 5V→3.3V).',
        params: 'Ninguno',
        requestExample: 'GET /api/robot/sensores/distancia',
        responseExample: `{
  "ok": true,
  "distance_cm": 42,
  "level": "precaucion",
  "gpio": { "trig": 13, "echo": 14 }
}`,
        run: () => robotService.getDistancia(),
    },
    {
        id: 'camara-on',
        group: 'Cámara',
        method: 'POST',
        path: '/api/robot/camara/encender',
        desc: 'Activa ESP32-CAM para lectura de QR de mesa.',
        params: 'Ninguno',
        requestExample: 'POST /api/robot/camara/encender',
        responseExample: `{ "ok": true, "robot": { "camera": true } }`,
        run: () => robotService.camaraOn(),
    },
    {
        id: 'linterna-on',
        group: 'Linterna',
        method: 'POST',
        path: '/api/robot/linterna/encender',
        desc: 'Enciende el flash de la ESP32-CAM.',
        params: 'Ninguno',
        requestExample: 'POST /api/robot/linterna/encender',
        responseExample: `{ "ok": true, "robot": { "flashlight": true } }`,
        run: () => robotService.linternaOn(),
    },
    {
        id: 'emergencia',
        group: 'Seguridad',
        method: 'POST',
        path: '/api/robot/emergencia',
        desc: 'Parada de emergencia: motores off, speed 0, bloquea controles.',
        params: 'Ninguno',
        requestExample: 'POST /api/robot/emergencia',
        responseExample: `{
  "ok": true,
  "message": "Parada de emergencia activada",
  "robot": { "emergency": true, "speed": 0 }
}`,
        run: () => robotService.emergencia(),
    },
    {
        id: 'home',
        group: 'Automático',
        method: 'POST',
        path: '/api/robot/regresar-base',
        desc: 'Ordena regreso a la base de carga.',
        params: 'Ninguno',
        requestExample: 'POST /api/robot/regresar-base',
        responseExample: `{ "ok": true, "robot": { "status": "regresando", "qr_target": "BASE" } }`,
        run: () => robotService.regresarBase(),
    },
];

export default function DocumentacionSection() {
    const [mesa, setMesa] = useState('2');
    const [speed, setSpeed] = useState(50);
    const [mode, setMode] = useState('simulation');
    const [esp32Url, setEsp32Url] = useState('http://192.168.4.1');
    const [robotSnapshot, setRobotSnapshot] = useState<Record<
        string,
        unknown
    > | null>(null);
    const [log, setLog] = useState<string[]>([
        '> Cliente listo. Laravel API en /api/robot/*',
    ]);
    const [copied, setCopied] = useState<string | null>(null);
    const [testing, setTesting] = useState<string | null>(null);
    const [lastResponse, setLastResponse] = useState<string>('');

    const pushLog = (line: string) => {
        setLog((prev) => [`> ${line}`, ...prev].slice(0, 14));
    };

    useEffect(() => {
        robotService.getConfig().then((res) => {
            if (res.ok) {
                setMode(String(res.mode ?? 'simulation'));
                if (typeof res.esp32_base_url === 'string') {
                    setEsp32Url(res.esp32_base_url);
                }
                pushLog(
                    `Config: mode=${res.mode} · ESP32=${res.esp32_base_url}`,
                );
            }
        });
        robotService.getEstado().then((res) => {
            if (res.robot) {
                setRobotSnapshot(res.robot);
            }
        });
    }, []);

    const runApi = async (doc: ApiDoc) => {
        setTesting(doc.id);
        pushLog(`${doc.method} ${doc.path} …`);
        try {
            const res = await doc.run();
            setLastResponse(JSON.stringify(res, null, 2));
            if (res.robot) {
                setRobotSnapshot(res.robot);
            }
            pushLog(
                res.ok
                    ? `OK · ${doc.path} · mode=${res.mode ?? '?'}`
                    : `FAIL · ${res.error ?? 'error'} · ${res.message ?? ''}`,
            );
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Error de red';
            pushLog(`ERROR · ${message}`);
            setLastResponse(JSON.stringify({ ok: false, message }, null, 2));
        } finally {
            setTesting(null);
        }
    };

    const sendGoto = async () => {
        pushLog(`POST /api/robot/goto { "mesa": ${mesa} }`);
        const res = await robotService.goto(Number(mesa));
        setLastResponse(JSON.stringify(res, null, 2));
        if (res.robot) {
            setRobotSnapshot(res.robot);
        }
        pushLog(
            res.ok
                ? String(res.message ?? 'Goto enviado')
                : String(res.message ?? res.error),
        );
    };

    const sendMove = async (
        action:
            | 'avanzar'
            | 'retroceder'
            | 'izquierda'
            | 'derecha'
            | 'detener'
            | 'home',
    ) => {
        const map = {
            avanzar: () => robotService.avanzar(speed),
            retroceder: () => robotService.retroceder(speed),
            izquierda: () => robotService.izquierda(speed),
            derecha: () => robotService.derecha(speed),
            detener: () => robotService.detener(),
            home: () => robotService.regresarBase(),
        } as const;

        pushLog(`Comando manual: ${action} (speed=${speed})`);
        const res = await map[action]();
        setLastResponse(JSON.stringify(res, null, 2));
        if (res.robot) {
            setRobotSnapshot(res.robot);
        }
        pushLog(res.ok ? `OK ${action}` : `FAIL ${res.message ?? res.error}`);
    };

    const copyCurl = async (doc: ApiDoc) => {
        const curl =
            doc.method === 'GET'
                ? `curl -s ${window.location.origin}${doc.path}`
                : `curl -s -X POST ${window.location.origin}${doc.path} -H "Content-Type: application/json" -H "Accept: application/json" -d '${doc.requestExample.startsWith('{') ? doc.requestExample.replace(/\s+/g, ' ') : '{}'}'`;
        await navigator.clipboard.writeText(curl);
        setCopied(doc.id);
        window.setTimeout(() => setCopied(null), 1500);
    };

    const status = String(robotSnapshot?.status ?? '—');
    const emergency = Boolean(robotSnapshot?.emergency);

    return (
        <section className="animate-in fade-in slide-in-from-bottom-3 space-y-8 duration-500">
            <div className="max-w-3xl space-y-4">
                <p className="text-xs font-semibold tracking-[0.14em] text-[oklch(0.42_0.09_185)] uppercase">
                    Documentación
                </p>
                <h1 className="text-4xl font-semibold tracking-tight text-[oklch(0.22_0.02_200)] sm:text-5xl">
                    API lista para el ESP32
                </h1>
                <p className="text-lg leading-relaxed text-[oklch(0.45_0.02_200)]">
                    Laravel expone{' '}
                    <code className="rounded bg-black/5 px-1.5 py-0.5 text-sm">
                        /api/robot/*
                    </code>
                    . En modo simulación responde aquí; en modo real reenvía al
                    ESP32-CAM por WiFi (
                    <code className="rounded bg-black/5 px-1.5 py-0.5 text-sm">
                        ESP32_BASE_URL
                    </code>
                    ).
                </p>
            </div>

            <div className="grid gap-3 rounded-2xl border border-[oklch(0.22_0.02_200/0.08)] bg-white/80 p-4 shadow-sm sm:grid-cols-3">
                <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[oklch(0.45_0.02_200)] uppercase">
                        <Wifi className="size-3.5" /> Modo actual
                    </p>
                    <Badge
                        className={cn(
                            mode === 'real'
                                ? 'bg-amber-600'
                                : 'bg-[oklch(0.42_0.09_185)]',
                        )}
                    >
                        {mode === 'real' ? 'Real → ESP32' : 'Simulación'}
                    </Badge>
                </div>
                <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs font-semibold tracking-wide text-[oklch(0.45_0.02_200)] uppercase">
                        URL del ESP32 (.env)
                    </p>
                    <div className="flex gap-2">
                        <Input
                            value={esp32Url}
                            readOnly
                            className="font-mono text-xs"
                        />
                    </div>
                    <p className="text-xs text-[oklch(0.45_0.02_200)]">
                        Cambia en <code>.env</code>:{' '}
                        <code>ROBOT_MODE=real</code> y{' '}
                        <code>ESP32_BASE_URL=http://IP_DEL_ESP32</code>
                    </p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-[oklch(0.22_0.02_200)]">
                        <Terminal className="size-4 text-[oklch(0.42_0.09_185)]" />
                        Endpoints (Probar / Copiar curl)
                    </div>

                    <div className="space-y-3">
                        {docs.map((doc) => (
                            <div
                                key={doc.id}
                                className="rounded-2xl border border-[oklch(0.22_0.02_200/0.08)] bg-white/80 p-4 shadow-sm"
                            >
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{doc.group}</Badge>
                                    <Badge
                                        className={cn(
                                            doc.method === 'GET'
                                                ? 'bg-[oklch(0.55_0.1_185)]'
                                                : 'bg-[oklch(0.42_0.09_185)]',
                                        )}
                                    >
                                        {doc.method}
                                    </Badge>
                                    <code className="text-sm font-semibold break-all text-[oklch(0.22_0.02_200)]">
                                        {doc.path}
                                    </code>
                                </div>
                                <p className="mb-2 text-sm text-[oklch(0.45_0.02_200)]">
                                    {doc.desc}
                                </p>
                                <p className="mb-2 text-xs text-[oklch(0.45_0.02_200)]">
                                    <span className="font-semibold">
                                        Parámetros:
                                    </span>{' '}
                                    {doc.params}
                                </p>
                                <pre className="mb-2 overflow-x-auto rounded-lg bg-[oklch(0.22_0.02_200)] px-3 py-2 text-[11px] leading-relaxed text-[oklch(0.92_0.01_185)]">
                                    {doc.requestExample}
                                </pre>
                                <details className="mb-3">
                                    <summary className="cursor-pointer text-xs font-medium text-[oklch(0.42_0.09_185)]">
                                        Ejemplo de respuesta
                                    </summary>
                                    <pre className="mt-2 overflow-x-auto rounded-lg bg-black/5 px-3 py-2 text-[11px] text-[oklch(0.3_0.02_200)]">
                                        {doc.responseExample}
                                    </pre>
                                </details>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="gap-1.5 bg-[oklch(0.42_0.09_185)] hover:bg-[oklch(0.38_0.09_185)]"
                                        disabled={testing === doc.id}
                                        onClick={() => runApi(doc)}
                                    >
                                        <Play className="size-3.5" />
                                        {testing === doc.id
                                            ? 'Probando…'
                                            : 'Probar'}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5"
                                        onClick={() => copyCurl(doc)}
                                    >
                                        <Copy className="size-3.5" />
                                        {copied === doc.id
                                            ? 'Copiado'
                                            : 'Copiar curl'}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-[oklch(0.22_0.02_200)]">
                            Panel de control (live API)
                        </p>
                        <Badge
                            variant={emergency ? 'destructive' : 'outline'}
                            className="capitalize"
                        >
                            {emergency ? 'Emergencia' : status}
                        </Badge>
                    </div>

                    <div className="rounded-2xl border border-[oklch(0.22_0.02_200/0.08)] bg-white/80 p-4 shadow-sm">
                        <p className="mb-3 text-xs font-semibold tracking-wide text-[oklch(0.45_0.02_200)] uppercase">
                            Entrega automática (QR)
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={mesa} onValueChange={setMesa}>
                                <SelectTrigger className="w-[140px] bg-white">
                                    <SelectValue placeholder="Mesa" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4].map((n) => (
                                        <SelectItem key={n} value={String(n)}>
                                            Mesa {n} (QR M{n})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                className="gap-2 bg-[oklch(0.42_0.09_185)] hover:bg-[oklch(0.38_0.09_185)]"
                                onClick={sendGoto}
                                disabled={emergency}
                            >
                                <Send className="size-4" />
                                Enviar al ESP32
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[oklch(0.22_0.02_200/0.08)] bg-white/80 p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold tracking-wide text-[oklch(0.45_0.02_200)] uppercase">
                                Movimiento manual
                            </p>
                            <label className="flex items-center gap-2 text-xs text-[oklch(0.45_0.02_200)]">
                                PWM
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={speed}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        setSpeed(value);
                                    }}
                                    onMouseUp={() =>
                                        robotService.velocidad(speed)
                                    }
                                    className="w-20 accent-[oklch(0.42_0.09_185)]"
                                    disabled={emergency}
                                />
                                <span className="w-8 tabular-nums">
                                    {speed}%
                                </span>
                            </label>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {(
                                [
                                    {
                                        id: 'avanzar' as const,
                                        label: 'Avanzar',
                                        icon: ArrowUp,
                                    },
                                    {
                                        id: 'izquierda' as const,
                                        label: 'Izquierda',
                                        icon: ArrowLeft,
                                    },
                                    {
                                        id: 'detener' as const,
                                        label: 'Detener',
                                        icon: CircleStop,
                                    },
                                    {
                                        id: 'derecha' as const,
                                        label: 'Derecha',
                                        icon: ArrowRight,
                                    },
                                    {
                                        id: 'retroceder' as const,
                                        label: 'Atrás',
                                        icon: ArrowDown,
                                    },
                                    {
                                        id: 'home' as const,
                                        label: 'Base',
                                        icon: Home,
                                    },
                                ] as const
                            ).map((action) => {
                                const Icon = action.icon;

                                return (
                                    <Button
                                        key={action.id}
                                        type="button"
                                        variant="outline"
                                        className="h-auto flex-col gap-1 py-3"
                                        disabled={emergency}
                                        onClick={() => sendMove(action.id)}
                                    >
                                        <Icon className="size-4" />
                                        <span className="text-xs">
                                            {action.label}
                                        </span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={async () => {
                                const res = await robotService.camaraOn();
                                pushLog('Cámara ON');
                                if (res.robot) {
                                    setRobotSnapshot(res.robot);
                                }
                            }}
                        >
                            Cámara ON
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={async () => {
                                const res = await robotService.camaraOff();
                                pushLog('Cámara OFF');
                                if (res.robot) {
                                    setRobotSnapshot(res.robot);
                                }
                            }}
                        >
                            Cámara OFF
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={async () => {
                                const res = await robotService.linternaOn();
                                pushLog('Linterna ON');
                                if (res.robot) {
                                    setRobotSnapshot(res.robot);
                                }
                            }}
                        >
                            <Flashlight className="size-4" />
                            Linterna
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            className="gap-2"
                            onClick={async () => {
                                const res = emergency
                                    ? await robotService.reactivar()
                                    : await robotService.emergencia();
                                pushLog(
                                    emergency
                                        ? 'Robot reactivado'
                                        : 'EMERGENCIA',
                                );
                                if (res.robot) {
                                    setRobotSnapshot(res.robot);
                                }
                                setLastResponse(
                                    JSON.stringify(res, null, 2),
                                );
                            }}
                        >
                            <ShieldAlert className="size-4" />
                            {emergency ? 'Reactivar' : 'Emergencia'}
                        </Button>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-[oklch(0.22_0.02_200/0.08)] bg-[oklch(0.22_0.02_200)] shadow-sm">
                        <div className="border-b border-white/10 px-4 py-2 text-xs font-medium tracking-wide text-white/60 uppercase">
                            Consola HTTP
                        </div>
                        <div className="max-h-40 space-y-1 overflow-y-auto p-4 font-mono text-[11px] text-[oklch(0.85_0.05_160)]">
                            {log.map((line, index) => (
                                <p key={`${line}-${index}`}>{line}</p>
                            ))}
                        </div>
                    </div>

                    {lastResponse && (
                        <div className="overflow-hidden rounded-2xl border border-[oklch(0.22_0.02_200/0.08)] bg-white/80 shadow-sm">
                            <div className="border-b px-4 py-2 text-xs font-medium tracking-wide text-[oklch(0.45_0.02_200)] uppercase">
                                Última respuesta JSON
                            </div>
                            <pre className="max-h-48 overflow-auto p-3 text-[11px] text-[oklch(0.3_0.02_200)]">
                                {lastResponse}
                            </pre>
                        </div>
                    )}

                    <div className="rounded-2xl border border-[oklch(0.22_0.02_200/0.08)] bg-white/80 p-4 text-xs leading-relaxed text-[oklch(0.4_0.02_200)] shadow-sm">
                        <p className="mb-2 font-semibold text-[oklch(0.22_0.02_200)]">
                            Contrato ESP32 (firmware)
                        </p>
                        <ul className="list-disc space-y-1 pl-4">
                            <li>
                                Laravel →{' '}
                                <code>POST {'{ESP32}'}/cmd/goto</code> body{' '}
                                <code>{'{ mesa, qr }'}</code>
                            </li>
                            <li>
                                Manual:{' '}
                                <code>/cmd/avanzar|retroceder|izquierda|derecha|stop</code>
                            </li>
                            <li>
                                Sensor: <code>GET /sensors/distance</code>
                            </li>
                            <li>
                                GPIO motores: 25/26 (izq), 27/33 (der) · TRIG
                                13 · ECHO 14
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
