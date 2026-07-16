import { cn } from '@/lib/utils';
import type { DeliveryPhase } from '@/lib/simulation/simulation-service';
import { PHASE_LABEL, sensorStatus } from '@/lib/simulation/simulation-service';

type RobotTelemetryProps = {
    phase: DeliveryPhase;
    destination: number | null;
    distanceRemainingM: number;
    distanceCm: number;
    speed: number;
    battery: number;
    connection: 'connected' | 'disconnected';
};

export default function RobotTelemetry({
    phase,
    destination,
    distanceRemainingM,
    distanceCm,
    speed,
    battery,
    connection,
}: RobotTelemetryProps) {
    const sensor = sensorStatus(distanceCm);

    const rows: { label: string; value: string; tone?: string }[] = [
        {
            label: 'Estado',
            value: PHASE_LABEL[phase],
            tone:
                phase === 'obstacle'
                    ? 'text-amber-400'
                    : phase === 'delivered' ||
                        phase === 'available' ||
                        phase === 'idle'
                      ? 'text-emerald-400'
                      : 'text-sky-300',
        },
        {
            label: 'Destino',
            value: destination ? `Mesa ${destination}` : '—',
        },
        {
            label: 'Restante',
            value: `${distanceRemainingM.toFixed(1)} m`,
        },
        {
            label: 'Sensor',
            value: `${distanceCm} cm`,
            tone:
                sensor.tone === 'danger'
                    ? 'text-red-400'
                    : sensor.tone === 'warn'
                      ? 'text-amber-400'
                      : 'text-emerald-400',
        },
        {
            label: 'Vel.',
            value: `${speed}%`,
        },
        {
            label: 'Bat.',
            value: `${battery}%`,
        },
        {
            label: 'Enlace',
            value: connection === 'connected' ? 'OK' : 'Off',
            tone:
                connection === 'connected' ? 'text-emerald-400' : 'text-red-400',
        },
    ];

    return (
        <div>
            <p className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Información
            </p>
            <dl className="space-y-1">
                {rows.map((row) => (
                    <div
                        key={row.label}
                        className="flex items-baseline justify-between gap-2 text-[11px]"
                    >
                        <dt className="text-slate-500">{row.label}</dt>
                        <dd
                            className={cn(
                                'truncate font-medium text-slate-100',
                                row.tone,
                            )}
                        >
                            {row.value}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
