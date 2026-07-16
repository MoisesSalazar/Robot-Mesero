import {
    Check,
    Eraser,
    Minus,
    Plus,
    Send,
    ShoppingBag,
    Trash2,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    MENU_CATEGORIES,
    MENU_ITEMS,
    formatPrice,
    type MenuCategory,
    type MenuItem,
} from '@/data/menu-items';
import { robotService } from '@/lib/robot-service';
import { cn } from '@/lib/utils';

type CartLine = {
    item: MenuItem;
    qty: number;
};

type SentOrder = {
    id: string;
    mesa: number;
    lines: CartLine[];
    note: string;
    total: number;
    time: string;
    status: 'en_camino' | 'entregado' | 'error';
    message: string;
};

const TABLES = [1, 2, 3, 4, 5] as const;

function nowTime() {
    return new Date().toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function MenuSection() {
    const [category, setCategory] = useState<MenuCategory | 'todos'>('todos');
    const [mesa, setMesa] = useState(1);
    const [cart, setCart] = useState<CartLine[]>([]);
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);
    const [orders, setOrders] = useState<SentOrder[]>([]);

    const visibleItems = useMemo(
        () =>
            category === 'todos'
                ? MENU_ITEMS
                : MENU_ITEMS.filter((item) => item.category === category),
        [category],
    );

    const activeOrders = useMemo(
        () => orders.filter((o) => o.status === 'en_camino' || o.status === 'error'),
        [orders],
    );

    const busyTables = useMemo(() => {
        const set = new Set<number>();
        for (const order of activeOrders) {
            set.add(order.mesa);
        }
        return set;
    }, [activeOrders]);

    const total = cart.reduce(
        (sum, line) => sum + line.item.price * line.qty,
        0,
    );
    const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);

    const selectMesa = (n: number) => {
        if (n === mesa) {
            return;
        }
        setMesa(n);
        setCart([]);
        setNote('');
    };

    const addItem = (item: MenuItem) => {
        setCart((prev) => {
            const existing = prev.find((line) => line.item.id === item.id);
            if (existing) {
                return prev.map((line) =>
                    line.item.id === item.id
                        ? { ...line, qty: line.qty + 1 }
                        : line,
                );
            }
            return [...prev, { item, qty: 1 }];
        });
    };

    const changeQty = (id: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((line) =>
                    line.item.id === id
                        ? { ...line, qty: line.qty + delta }
                        : line,
                )
                .filter((line) => line.qty > 0),
        );
    };

    const clearCart = () => {
        setCart([]);
        setNote('');
    };

    const clearTableOrders = (table: number) => {
        setOrders((prev) => prev.filter((order) => order.mesa !== table));
        if (mesa === table) {
            clearCart();
        }
    };

    const clearAllOrders = () => {
        setOrders([]);
        clearCart();
    };

    const markDelivered = (id: string) => {
        setOrders((prev) => prev.filter((order) => order.id !== id));
    };

    const sendOrder = async () => {
        if (cart.length === 0 || sending) {
            return;
        }

        setSending(true);

        const snapshot = cart.map((line) => ({ ...line }));
        const orderTotal = total;
        const orderNote = note.trim();
        const targetMesa = mesa;
        const res = await robotService.goto(targetMesa);

        const order: SentOrder = {
            id: `ord-${Date.now()}`,
            mesa: targetMesa,
            lines: snapshot,
            note: orderNote,
            total: orderTotal,
            time: nowTime(),
            status: res.ok ? 'en_camino' : 'error',
            message:
                res.message ??
                (res.ok
                    ? `Robot en camino a mesa ${targetMesa}`
                    : 'No se pudo enviar el pedido'),
        };

        // Una sola orden activa por mesa: reemplaza la anterior
        setOrders((prev) => [
            order,
            ...prev.filter((o) => o.mesa !== targetMesa),
        ]);

        if (res.ok) {
            clearCart();
        }

        setSending(false);
    };

    return (
        <section className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div className="overflow-hidden rounded-2xl border border-[oklch(0.22_0.02_200/0.1)] bg-white/85 shadow-[0_20px_50px_-28px_oklch(0.42_0.09_185/0.45)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[oklch(0.22_0.02_200/0.08)] px-4 py-3 sm:px-5">
                    <div>
                        <p className="text-[10px] font-semibold tracking-[0.16em] text-[oklch(0.42_0.09_185)] uppercase">
                            Pedidos
                        </p>
                        <h1 className="text-xl font-semibold tracking-tight text-[oklch(0.22_0.02_200)] sm:text-2xl">
                            Menú mesero
                        </h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-[oklch(0.42_0.09_185)]">
                            Mesa {mesa} · {itemCount} ítems
                        </Badge>
                        {busyTables.size > 0 && (
                            <Badge
                                variant="outline"
                                className="border-amber-500/40 text-amber-700"
                            >
                                {busyTables.size} ocupada
                                {busyTables.size === 1 ? '' : 's'}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="grid lg:min-h-[560px] lg:grid-cols-[minmax(0,1fr)_280px] lg:items-stretch">
                    <div className="flex flex-col border-b border-[oklch(0.22_0.02_200/0.08)] p-4 lg:border-r lg:border-b-0 sm:p-5">
                        <div className="mb-4">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="text-[10px] font-semibold tracking-[0.14em] text-[oklch(0.5_0.02_200)] uppercase">
                                    Mesa destino
                                </p>
                                <button
                                    type="button"
                                    onClick={() => clearTableOrders(mesa)}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-[oklch(0.45_0.02_200)] hover:text-[oklch(0.42_0.09_185)]"
                                >
                                    <Eraser className="size-3" />
                                    Limpiar M{mesa}
                                </button>
                            </div>
                            <div className="grid grid-cols-5 gap-1.5">
                                {TABLES.map((n) => {
                                    const busy = busyTables.has(n);

                                    return (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => selectMesa(n)}
                                            className={cn(
                                                'relative rounded-lg py-2.5 text-sm font-semibold transition',
                                                mesa === n
                                                    ? 'bg-[oklch(0.42_0.09_185)] text-white shadow-sm'
                                                    : busy
                                                      ? 'border border-amber-400/50 bg-amber-50 text-amber-900'
                                                      : 'border border-[oklch(0.22_0.02_200/0.1)] bg-[oklch(0.98_0.005_200)] text-[oklch(0.3_0.02_200)] hover:bg-[oklch(0.22_0.02_200/0.04)]',
                                            )}
                                        >
                                            M{n}
                                            {busy && (
                                                <span
                                                    className={cn(
                                                        'absolute top-1 right-1 size-1.5 rounded-full',
                                                        mesa === n
                                                            ? 'bg-amber-300'
                                                            : 'bg-amber-500',
                                                    )}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mb-3 flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => setCategory('todos')}
                                className={cn(
                                    'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                                    category === 'todos'
                                        ? 'bg-[oklch(0.42_0.09_185)] text-white'
                                        : 'bg-[oklch(0.22_0.02_200/0.05)] text-[oklch(0.4_0.02_200)] hover:bg-[oklch(0.22_0.02_200/0.08)]',
                                )}
                            >
                                Todos
                            </button>
                            {MENU_CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setCategory(cat.id)}
                                    className={cn(
                                        'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                                        category === cat.id
                                            ? 'bg-[oklch(0.42_0.09_185)] text-white'
                                            : 'bg-[oklch(0.22_0.02_200/0.05)] text-[oklch(0.4_0.02_200)] hover:bg-[oklch(0.22_0.02_200/0.08)]',
                                    )}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid flex-1 content-start gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                            {visibleItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => addItem(item)}
                                    className="group flex h-full gap-2.5 rounded-xl border border-[oklch(0.22_0.02_200/0.08)] bg-[oklch(0.99_0.005_200)] p-2.5 text-left transition hover:border-[oklch(0.42_0.09_185/0.4)] hover:shadow-md"
                                >
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.42_0.09_185/0.1)] text-[oklch(0.42_0.09_185)]">
                                        <item.icon className="size-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-start justify-between gap-1.5">
                                            <span className="text-sm leading-snug font-semibold text-[oklch(0.22_0.02_200)]">
                                                {item.name}
                                            </span>
                                            <span className="shrink-0 text-xs font-bold text-[oklch(0.42_0.09_185)]">
                                                {formatPrice(item.price)}
                                            </span>
                                        </span>
                                        <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-[oklch(0.5_0.02_200)]">
                                            {item.description}
                                        </span>
                                        <span className="mt-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-[oklch(0.42_0.09_185)] opacity-70 group-hover:opacity-100">
                                            <Plus className="size-3" />
                                            Agregar
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <aside className="flex flex-col bg-[#0f141d] text-slate-100">
                        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="size-4 text-sky-300" />
                                <p className="text-sm font-semibold">
                                    Pedido actual
                                </p>
                            </div>
                            <span className="text-xs text-slate-400">
                                Mesa {mesa}
                                {busyTables.has(mesa) ? ' · ocupada' : ''}
                            </span>
                        </div>

                        <div className="min-h-[140px] flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
                            {cart.length === 0 ? (
                                <p className="flex h-full min-h-[120px] items-center justify-center text-center text-xs text-slate-500">
                                    Toca un platillo para agregarlo
                                </p>
                            ) : (
                                cart.map((line) => (
                                    <div
                                        key={line.item.id}
                                        className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5"
                                    >
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-300">
                                            <line.item.icon className="size-3.5" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-medium">
                                                {line.item.name}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {formatPrice(line.item.price)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    changeQty(line.item.id, -1)
                                                }
                                                className="inline-flex size-6 items-center justify-center rounded-md bg-white/10 hover:bg-white/15"
                                                aria-label="Quitar uno"
                                            >
                                                <Minus className="size-3" />
                                            </button>
                                            <span className="w-4 text-center text-xs tabular-nums">
                                                {line.qty}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    changeQty(line.item.id, 1)
                                                }
                                                className="inline-flex size-6 items-center justify-center rounded-md bg-white/10 hover:bg-white/15"
                                                aria-label="Agregar uno"
                                            >
                                                <Plus className="size-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="space-y-2.5 border-t border-white/10 px-3 py-3">
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={2}
                                placeholder="Nota: sin cebolla, extra salsa…"
                                className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none"
                            />

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Total</span>
                                <span className="text-lg font-semibold tabular-nums">
                                    {formatPrice(total)}
                                </span>
                            </div>

                            <div className="grid grid-cols-[1fr_auto] gap-1.5">
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-9 gap-1.5 bg-sky-600 hover:bg-sky-500"
                                    disabled={cart.length === 0 || sending}
                                    onClick={sendOrder}
                                >
                                    <Send className="size-3.5" />
                                    {sending
                                        ? 'Enviando…'
                                        : `Enviar M${mesa}`}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-9 border-white/10 bg-transparent text-slate-200 hover:bg-white/5"
                                    disabled={cart.length === 0}
                                    onClick={clearCart}
                                    aria-label="Vaciar pedido"
                                >
                                    <Trash2 className="size-3.5" />
                                </Button>
                            </div>
                        </div>

                        <div className="border-t border-white/10 px-3 py-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                                    Órdenes activas
                                </p>
                                {orders.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={clearAllOrders}
                                        className="text-[10px] font-semibold text-slate-500 hover:text-red-300"
                                    >
                                        Limpiar todas
                                    </button>
                                )}
                            </div>
                            {activeOrders.length === 0 ? (
                                <p className="text-[11px] text-slate-500">
                                    Sin pedidos activos. Las mesas están libres.
                                </p>
                            ) : (
                                <div className="max-h-[180px] space-y-1.5 overflow-y-auto">
                                    {activeOrders.map((order) => (
                                        <div
                                            key={order.id}
                                            className="rounded-lg bg-white/5 px-2.5 py-2"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-[11px] font-semibold">
                                                    M{order.mesa} · {order.time}
                                                </p>
                                                <span
                                                    className={cn(
                                                        'rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase',
                                                        order.status === 'error'
                                                            ? 'bg-red-500/20 text-red-300'
                                                            : 'bg-sky-500/20 text-sky-300',
                                                    )}
                                                >
                                                    {order.status === 'error'
                                                        ? 'Error'
                                                        : 'En camino'}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">
                                                {order.lines
                                                    .map(
                                                        (l) =>
                                                            `${l.qty}× ${l.item.name}`,
                                                    )
                                                    .join(', ')}
                                            </p>
                                            <div className="mt-1.5 flex items-center justify-between gap-2">
                                                <p className="text-[11px] font-medium text-sky-300">
                                                    {formatPrice(order.total)}
                                                </p>
                                                <div className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            markDelivered(
                                                                order.id,
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/25"
                                                        title="Marcar entregado y liberar mesa"
                                                    >
                                                        <Check className="size-3" />
                                                        Listo
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            clearTableOrders(
                                                                order.mesa,
                                                            )
                                                        }
                                                        className="inline-flex items-center justify-center rounded-md bg-white/10 px-1.5 py-0.5 text-slate-400 hover:bg-white/15 hover:text-red-300"
                                                        title="Limpiar mesa"
                                                        aria-label={`Limpiar mesa ${order.mesa}`}
                                                    >
                                                        <X className="size-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </section>
    );
}
