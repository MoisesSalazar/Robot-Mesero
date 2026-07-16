import { cn } from '@/lib/utils';

/** Mini patrón QR decorativo para mesas. */
export default function TableQrBadge({
    code,
    active = false,
    className,
}: {
    code: string;
    active?: boolean;
    className?: string;
}) {
    // Matriz fija 5x5 que “parece” un QR (esquinas de búsqueda)
    const cells = [
        1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1,
        1,
    ];

    return (
        <div
            className={cn(
                'flex flex-col items-center gap-0.5 rounded-md bg-white p-1 shadow-sm',
                active && 'ring-2 ring-sky-400',
                className,
            )}
            title={`QR ${code}`}
        >
            <div className="grid size-7 grid-cols-5 gap-px">
                {cells.map((on, i) => (
                    <span
                        key={i}
                        className={cn(
                            'rounded-[1px]',
                            on ? 'bg-neutral-900' : 'bg-white',
                        )}
                    />
                ))}
            </div>
            <span className="text-[8px] font-bold tracking-wide text-neutral-800">
                {code}
            </span>
        </div>
    );
}
