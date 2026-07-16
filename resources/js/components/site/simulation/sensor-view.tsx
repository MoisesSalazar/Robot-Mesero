import { cn } from '@/lib/utils';
import {
    IR_MAX_RANGE,
    sensorStatus,
    type RayHit,
} from '@/lib/simulation/simulation-service';

type SensorViewProps = {
    distanceCm: number;
    rays: RayHit[];
    avoiding?: boolean;
};

export default function SensorView({
    distanceCm,
    rays,
    avoiding = false,
}: SensorViewProps) {
    const sensor = sensorStatus(distanceCm);
    const cx = 80;
    const cy = 78;
    const scale = 68 / IR_MAX_RANGE;

    return (
        <div>
            <p className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Sensor IR
            </p>
            <div className="relative mx-auto h-[72px] w-full">
                <svg viewBox="0 0 160 90" className="size-full" aria-hidden>
                    <path
                        d="M12 78 A68 68 0 0 1 148 78"
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="1"
                    />
                    <path
                        d="M32 78 A48 48 0 0 1 128 78"
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="1"
                    />

                    {rays.map((ray, index) => {
                        const forward =
                            rays[Math.floor(rays.length / 2)]?.angleDeg ??
                            ray.angleDeg;
                        const relative =
                            ((ray.angleDeg - forward) * Math.PI) / 180;
                        const len = ray.distance * scale;
                        const x2 = cx + Math.sin(relative) * len;
                        const y2 = cy - Math.cos(relative) * len;

                        return (
                            <line
                                key={`sensor-ray-${index}`}
                                x1={cx}
                                y1={cy}
                                x2={x2}
                                y2={y2}
                                stroke={
                                    ray.hit
                                        ? ray.distance < 6
                                            ? 'rgba(248,113,113,0.95)'
                                            : 'rgba(251,146,60,0.85)'
                                        : 'rgba(56,189,248,0.55)'
                                }
                                strokeWidth={ray.hit ? 1.6 : 1.1}
                            />
                        );
                    })}

                    <circle cx={cx} cy={cy} r={3.5} fill="#38bdf8" />
                </svg>
            </div>
            <p
                className={cn(
                    'mt-1 text-center text-[11px] font-semibold tabular-nums',
                    sensor.tone === 'danger' && 'text-red-400',
                    sensor.tone === 'warn' && 'text-amber-400',
                    sensor.tone === 'ok' && 'text-emerald-400',
                )}
            >
                {distanceCm} cm · {sensor.label}
                {avoiding ? ' · Giro' : ''}
            </p>
        </div>
    );
}
