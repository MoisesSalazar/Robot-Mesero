import { Dices, Pause, Play, RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TableMarker } from '@/lib/simulation/simulation-service';

type ScenarioPanelProps = {
    tables: TableMarker[];
    target: number;
    obstacleCount: number;
    obstacleTotal: number;
    disabled: boolean;
    deliveryActive: boolean;
    paused: boolean;
    speed: number;
    onSelectTable: (id: number) => void;
    onObstacleCountChange: (count: number) => void;
    onRandomizeObstacles: () => void;
    onSpawnFrontObstacle: () => void;
    onStartDelivery: () => void;
    onTogglePause: () => void;
    onToggleCamera: () => void;
    onSpeedChange: (value: number) => void;
    onReset: () => void;
};

export default function ScenarioPanel({
    tables,
    target,
    obstacleCount,
    obstacleTotal,
    disabled,
    deliveryActive,
    paused,
    speed,
    onSelectTable,
    onObstacleCountChange,
    onRandomizeObstacles,
    onSpawnFrontObstacle,
    onStartDelivery,
    onTogglePause,
    onToggleCamera,
    onSpeedChange,
    onReset,
}: ScenarioPanelProps) {
    return (
        <aside className="flex h-full flex-col gap-3">
            <div className="space-y-1.5">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                    Mesas
                </p>
                <div className="grid gap-0.5">
                    {tables.map((table) => {
                        const active = table.id === target;

                        return (
                            <button
                                key={table.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => onSelectTable(table.id)}
                                className={cn(
                                    'flex items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition',
                                    active
                                        ? 'bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/40'
                                        : 'text-slate-300 hover:bg-white/5',
                                    disabled && 'pointer-events-none opacity-45',
                                )}
                            >
                                <span className="font-medium">{table.label}</span>
                                <span className="text-[10px] text-slate-500">
                                    M{table.id}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-2 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                        Obstáculos
                    </p>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-400">
                        {obstacleTotal}
                    </span>
                </div>

                <label className="flex items-center gap-2 text-[11px] text-slate-400">
                    <input
                        type="range"
                        min={1}
                        max={5}
                        value={obstacleCount}
                        onChange={(e) =>
                            onObstacleCountChange(Number(e.target.value))
                        }
                        className="w-full accent-sky-500"
                    />
                    <span className="w-3 tabular-nums text-slate-200">
                        {obstacleCount}
                    </span>
                </label>

                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-full gap-1.5 border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/10"
                    onClick={onRandomizeObstacles}
                    disabled={disabled}
                >
                    <Dices className="size-3.5" />
                    Aleatorios
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-full gap-1.5 border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/10"
                    disabled={!deliveryActive}
                    onClick={onSpawnFrontObstacle}
                >
                    <TriangleAlert className="size-3.5" />
                    Frontal
                </Button>
            </div>

            <div className="mt-auto space-y-2 border-t border-white/10 pt-3">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                    Controles
                </p>
                <Button
                    type="button"
                    size="sm"
                    className="h-8 w-full gap-1.5 bg-sky-600 hover:bg-sky-500"
                    onClick={onStartDelivery}
                    disabled={deliveryActive && !paused}
                >
                    <Play className="size-3.5" />
                    Entrega M{target}
                </Button>
                <div className="grid grid-cols-2 gap-1.5">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 border-white/10 bg-transparent text-xs text-slate-200 hover:bg-white/5"
                        disabled={!deliveryActive}
                        onClick={onTogglePause}
                    >
                        <Pause className="size-3.5" />
                        {paused ? 'Play' : 'Pausa'}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 border-white/10 bg-transparent text-xs text-slate-200 hover:bg-white/5"
                        onClick={onToggleCamera}
                    >
                        Cámara
                    </Button>
                </div>
                <label className="flex items-center gap-2 text-[10px] text-slate-500">
                    Vel.
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={speed}
                        onChange={(e) => onSpeedChange(Number(e.target.value))}
                        className="w-full accent-sky-500"
                    />
                    <span className="w-8 tabular-nums text-slate-300">
                        {speed}%
                    </span>
                </label>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-full gap-1.5 border-white/10 bg-transparent text-xs text-slate-200 hover:bg-white/5"
                    onClick={onReset}
                >
                    <RotateCcw className="size-3.5" />
                    Reiniciar
                </Button>
            </div>
        </aside>
    );
}
