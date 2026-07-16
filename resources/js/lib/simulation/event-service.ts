export type SimEventType =
    | 'Sistema'
    | 'Automático'
    | 'Sensor'
    | 'Emergencia'
    | 'Manual';

export type SimEvent = {
    id: string;
    time: string;
    type: SimEventType;
    action: string;
    result: string;
};

export function createSimEvent(
    type: SimEventType,
    action: string,
    result: string,
): SimEvent {
    const now = new Date();
    const time = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    return {
        id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
        time,
        type,
        action,
        result,
    };
}
