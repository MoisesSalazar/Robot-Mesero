/**
 * Cliente HTTP centralizado para comandos del robot.
 * Laravel hace de puente: simulación local o reenvío al ESP32.
 */
const API_BASE_URL = '/api';

export type RobotApiResponse = {
    ok: boolean;
    mode?: 'simulation' | 'real';
    message?: string;
    error?: string;
    command?: string;
    robot?: Record<string, unknown>;
    distance_cm?: number;
    level?: string;
    esp32?: unknown;
    [key: string]: unknown;
};

async function request(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
): Promise<RobotApiResponse> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'same-origin',
    });

    const data = (await response.json()) as RobotApiResponse;

    if (!response.ok) {
        return {
            ...data,
            ok: false,
            error: data.error ?? `http_${response.status}`,
            message:
                data.message ??
                `Error HTTP ${response.status} en ${method} ${path}`,
        };
    }

    return data;
}

export const robotService = {
    getConfig: () => request('GET', '/robot/config'),
    getEstado: () => request('GET', '/robot/estado'),
    getDistancia: () => request('GET', '/robot/sensores/distancia'),

    goto: (mesa: number) => request('POST', '/robot/goto', { mesa }),
    regresarBase: () => request('POST', '/robot/regresar-base'),
    emergencia: () => request('POST', '/robot/emergencia'),
    reactivar: () => request('POST', '/robot/reactivar'),

    avanzar: (speed?: number) =>
        request('POST', '/robot/manual/avanzar', speed != null ? { speed } : {}),
    retroceder: (speed?: number) =>
        request(
            'POST',
            '/robot/manual/retroceder',
            speed != null ? { speed } : {},
        ),
    izquierda: (speed?: number) =>
        request(
            'POST',
            '/robot/manual/izquierda',
            speed != null ? { speed } : {},
        ),
    derecha: (speed?: number) =>
        request('POST', '/robot/manual/derecha', speed != null ? { speed } : {}),
    detener: () => request('POST', '/robot/manual/detener'),
    velocidad: (speed: number) =>
        request('POST', '/robot/manual/velocidad', { speed }),

    camaraOn: () => request('POST', '/robot/camara/encender'),
    camaraOff: () => request('POST', '/robot/camara/apagar'),
    linternaOn: () => request('POST', '/robot/linterna/encender'),
    linternaOff: () => request('POST', '/robot/linterna/apagar'),
};
