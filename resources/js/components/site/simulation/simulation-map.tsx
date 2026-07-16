import { TriangleAlert } from 'lucide-react';
import TableQrBadge from '@/components/site/simulation/table-qr-badge';
import { cn } from '@/lib/utils';
import {
    SIM_BASE,
    type DeliveryPhase,
    type Obstacle,
    type Point,
    type RayHit,
    type TableMarker,
} from '@/lib/simulation/simulation-service';

type SimulationMapProps = {
    robot: Point & { angle: number };
    tables: TableMarker[];
    obstacles: Obstacle[];
    rays: RayHit[];
    target: number;
    phase: DeliveryPhase;
    progress: number;
    goal: Point | null;
    traveledPath: Point[];
    avoiding?: boolean;
    distanceCm?: number;
    onSelectTable: (id: number) => void;
};

export default function SimulationMap({
    robot,
    tables,
    obstacles,
    rays,
    target,
    phase,
    progress,
    goal,
    traveledPath,
    avoiding = false,
    distanceCm = 0,
    onSelectTable,
}: SimulationMapProps) {
    const isBusy = phase !== 'idle' && phase !== 'available';
    const showRays = rays.length > 0;

    return (
        <div className="relative h-full min-h-[300px] w-full overflow-hidden rounded-xl bg-[#1a2332]">
            <div
                className="absolute inset-0"
                style={{
                    backgroundColor: '#c4b59a',
                    backgroundImage: `
                        linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)
                    `,
                    backgroundSize: '28px 28px',
                }}
            />

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.35))]" />

            {[
                { x: 8, y: 10 },
                { x: 92, y: 10 },
                { x: 8, y: 90 },
                { x: 92, y: 90 },
            ].map((p) => (
                <div
                    key={`${p.x}-${p.y}`}
                    className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-700 shadow-sm ring-2 ring-emerald-900/40"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                />
            ))}

            <div className="absolute top-[10%] left-[20%] h-2 w-[24%] rounded-sm bg-[#6b4f3a]/90" />

            {obstacles.map((obstacle) => (
                <div
                    key={obstacle.id}
                    className={cn(
                        'absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border text-[8px] font-bold uppercase',
                        phase === 'obstacle'
                            ? 'border-red-400 bg-red-600/90 text-white'
                            : 'border-slate-500 bg-slate-700/90 text-slate-200',
                    )}
                    style={{
                        left: `${obstacle.x}%`,
                        top: `${obstacle.y}%`,
                        width: `${obstacle.w}%`,
                        height: `${obstacle.h}%`,
                    }}
                >
                    Obstáculo
                </div>
            ))}

            <svg
                className="pointer-events-none absolute inset-0 size-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
            >
                {goal && isBusy && (
                    <line
                        x1={robot.x}
                        y1={robot.y}
                        x2={goal.x}
                        y2={goal.y}
                        stroke="rgba(239,68,68,0.4)"
                        strokeWidth="0.45"
                        strokeDasharray="1.4 1.4"
                    />
                )}

                {traveledPath.length > 1 && (
                    <polyline
                        fill="none"
                        stroke="rgba(34,197,94,0.75)"
                        strokeWidth="0.65"
                        strokeDasharray="1.2 1.2"
                        points={traveledPath
                            .map((p) => `${p.x},${p.y}`)
                            .join(' ')}
                    />
                )}

                {showRays &&
                    rays.map((ray, index) => (
                        <line
                            key={`ray-${index}`}
                            x1={robot.x}
                            y1={robot.y}
                            x2={ray.end.x}
                            y2={ray.end.y}
                            stroke={
                                ray.hit
                                    ? ray.distance < 6
                                        ? 'rgba(239,68,68,0.9)'
                                        : 'rgba(251,146,60,0.75)'
                                    : 'rgba(56,189,248,0.35)'
                            }
                            strokeWidth={ray.hit ? 0.45 : 0.28}
                        />
                    ))}
            </svg>

            <div
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
                style={{ left: `${SIM_BASE.x}%`, top: `${SIM_BASE.y}%` }}
            >
                <div className="flex size-7 items-center justify-center rounded-md bg-slate-900/85 ring-1 ring-emerald-400/60">
                    <span className="size-2 rounded-full bg-emerald-400" />
                </div>
                <span className="rounded bg-slate-900/70 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
                    Base
                </span>
            </div>

            {tables.map((table) => {
                const active = isBusy && table.id === target;
                const qrCode = `M${table.id}`;

                return (
                    <button
                        key={table.id}
                        type="button"
                        onClick={() => onSelectTable(table.id)}
                        className={cn(
                            'absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-lg border px-1.5 py-1 shadow-md transition',
                            active
                                ? 'border-sky-400 bg-[#5c4033] shadow-sky-400/30'
                                : 'border-[#3d2b22] bg-[#6b4f3a] hover:brightness-110',
                        )}
                        style={{ left: `${table.x}%`, top: `${table.y}%` }}
                    >
                        <TableQrBadge code={qrCode} active={active} />
                        <div className="pr-1 text-left">
                            <p className="text-[10px] font-semibold text-amber-50">
                                {table.label}
                            </p>
                            <p className="text-[8px] text-amber-100/70">
                                QR {qrCode}
                            </p>
                            {active && (
                                <p className="text-[8px] font-bold tracking-wide text-sky-300 uppercase">
                                    Destino
                                </p>
                            )}
                        </div>
                    </button>
                );
            })}

            <div
                className="absolute z-10"
                style={{
                    left: `${robot.x}%`,
                    top: `${robot.y}%`,
                    transform: `translate(-50%, -50%) rotate(${robot.angle + 90}deg)`,
                }}
            >
                <div className="relative flex h-8 w-6 flex-col items-center rounded-md border border-slate-300 bg-white shadow-lg">
                    <div className="mt-1 flex gap-0.5">
                        <span className="size-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                        <span className="size-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                    </div>
                    <div className="mt-auto mb-0.5 h-1.5 w-3 rounded-sm bg-slate-200" />
                </div>
                {(phase === 'en_route' ||
                    phase === 'leaving_base' ||
                    phase === 'returning' ||
                    phase === 'obstacle') && (
                    <div className="absolute -inset-2 -z-10 animate-ping rounded-full bg-sky-400/20" />
                )}
            </div>

            {avoiding && (
                <div className="pointer-events-none absolute top-2.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-amber-400/40 bg-black/65 px-3 py-1 text-[10px] font-medium text-amber-100 shadow-lg backdrop-blur-sm">
                    <TriangleAlert className="size-3 shrink-0 text-amber-300" />
                    IR {distanceCm} cm · evasión
                </div>
            )}

            <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-[9px] text-white/80">
                Progreso {Math.round(progress * 100)}%
            </div>
            <div className="absolute right-2 bottom-2 rounded bg-black/50 px-2 py-1 text-[9px] text-sky-200/90">
                IR · {rays.filter((r) => r.hit).length}/{rays.length} rayos
            </div>
        </div>
    );
}
