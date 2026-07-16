import { Check, Code2, Copy } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { firmwareTabs } from '@/data/firmware-tabs';
import { cn } from '@/lib/utils';

export default function CodigoSection() {
    const [activeId, setActiveId] = useState(firmwareTabs[0].id);
    const [copied, setCopied] = useState(false);

    const active =
        firmwareTabs.find((tab) => tab.id === activeId) ?? firmwareTabs[0];

    const copyCode = async () => {
        await navigator.clipboard.writeText(active.code);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    return (
        <section className="animate-in fade-in slide-in-from-bottom-3 mx-auto max-w-5xl space-y-6 duration-500">
            <div className="space-y-3">
                <p className="text-xs font-semibold tracking-[0.14em] text-[oklch(0.42_0.09_185)] uppercase">
                    Firmware
                </p>
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-semibold tracking-tight text-[oklch(0.22_0.02_200)]">
                            Código del ESP32
                        </h1>
                        <p className="max-w-2xl text-lg leading-relaxed text-[oklch(0.45_0.02_200)]">
                            Explicación por partes del archivo{' '}
                            <code className="rounded bg-black/5 px-1.5 py-0.5 text-sm">
                                robot.cpp
                            </code>
                            : pines, sensor, cámara, linterna y rutas HTTP listas
                            para controlar desde esta plataforma.
                        </p>
                    </div>
                    <Badge variant="outline" className="gap-1.5">
                        <Code2 className="size-3.5" />
                        C++ · ESP32-CAM
                    </Badge>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1.5 rounded-2xl border border-[oklch(0.22_0.02_200/0.08)] bg-white/70 p-1.5 shadow-sm">
                {firmwareTabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveId(tab.id)}
                        className={cn(
                            'rounded-xl px-3 py-2 text-sm font-medium transition',
                            activeId === tab.id
                                ? 'bg-[oklch(0.42_0.09_185)] text-white shadow-sm'
                                : 'text-[oklch(0.4_0.02_200)] hover:bg-[oklch(0.22_0.02_200/0.05)]',
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="space-y-3 rounded-2xl border border-[oklch(0.22_0.02_200/0.08)] bg-white/80 p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold text-[oklch(0.22_0.02_200)]">
                            {active.title}
                        </h2>
                        <p className="max-w-3xl text-sm leading-relaxed text-[oklch(0.45_0.02_200)]">
                            {active.summary}
                        </p>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={copyCode}
                    >
                        {copied ? (
                            <Check className="size-3.5" />
                        ) : (
                            <Copy className="size-3.5" />
                        )}
                        {copied ? 'Copiado' : 'Copiar código'}
                    </Button>
                </div>

                <pre className="max-h-[28rem] overflow-auto rounded-xl bg-[oklch(0.2_0.02_200)] p-4 text-[12px] leading-relaxed text-[oklch(0.9_0.02_185)] sm:text-[13px]">
                    <code>{active.code}</code>
                </pre>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    {
                        title: 'Wi‑Fi AP',
                        text: 'Red ROBOT_ESP32 · IP 192.168.4.1',
                    },
                    {
                        title: 'Sensor',
                        text: 'TRIG 13 · ECHO 14 (con divisor)',
                    },
                    {
                        title: 'QR',
                        text: 'GET /captura → imagen JPEG + jsQR',
                    },
                ].map((item) => (
                    <div
                        key={item.title}
                        className="rounded-xl border border-[oklch(0.22_0.02_200/0.08)] bg-white/70 px-4 py-3 shadow-sm"
                    >
                        <p className="text-sm font-semibold text-[oklch(0.22_0.02_200)]">
                            {item.title}
                        </p>
                        <p className="text-xs text-[oklch(0.45_0.02_200)]">
                            {item.text}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
