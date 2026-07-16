import type { LucideIcon } from 'lucide-react';
import { BookOpen, Bot, Code2, Presentation, UtensilsCrossed } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SiteSection =
    | 'presentacion'
    | 'menu'
    | 'documentacion'
    | 'simulacion'
    | 'codigo';

const navItems: {
    id: SiteSection;
    label: string;
    icon: LucideIcon;
}[] = [
    { id: 'presentacion', label: 'Presentación', icon: Presentation },
    { id: 'menu', label: 'Menú', icon: UtensilsCrossed },
    { id: 'documentacion', label: 'Documentación', icon: BookOpen },
    { id: 'simulacion', label: 'Simulación', icon: Bot },
    { id: 'codigo', label: 'Código', icon: Code2 },
];

type SiteLayoutProps = {
    active: SiteSection;
    onNavigate: (section: SiteSection) => void;
    children: ReactNode;
};

export default function SiteLayout({
    active,
    onNavigate,
    children,
}: SiteLayoutProps) {
    return (
        <div
            className="text-[oklch(0.22_0.02_200)] relative min-h-screen overflow-hidden"
            style={
                {
                    '--site-ink': 'oklch(0.22 0.02 200)',
                    '--site-mist': 'oklch(0.96 0.01 200)',
                    '--site-teal': 'oklch(0.55 0.1 185)',
                    '--site-teal-deep': 'oklch(0.42 0.09 185)',
                    background:
                        'radial-gradient(1200px 600px at 85% -10%, oklch(0.9 0.04 185 / 0.55), transparent 55%), radial-gradient(900px 500px at -10% 30%, oklch(0.94 0.02 80 / 0.4), transparent 50%), oklch(0.985 0.005 200)',
                } as CSSProperties
            }
        >
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.35]"
                style={{
                    backgroundImage: `
                        linear-gradient(oklch(0.22 0.02 200 / 0.05) 1px, transparent 1px),
                        linear-gradient(90deg, oklch(0.22 0.02 200 / 0.05) 1px, transparent 1px)
                    `,
                    backgroundSize: '48px 48px',
                    maskImage:
                        'radial-gradient(ellipse at center, black 20%, transparent 75%)',
                }}
            />

            <header className="relative z-50 border-b border-[oklch(0.22_0.02_200/0.08)] bg-[oklch(0.985_0.005_200/0.72)] backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                    <button
                        type="button"
                        onClick={() => onNavigate('presentacion')}
                        className="group flex items-center gap-2.5"
                    >
                        <span className="flex size-8 items-center justify-center rounded-lg bg-[oklch(0.42_0.09_185)] text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
                            <Bot className="size-4" />
                        </span>
                        <span className="text-lg font-semibold tracking-tight">
                            Robot Mesero
                        </span>
                    </button>

                    <nav className="flex items-center gap-1 rounded-full border border-[oklch(0.22_0.02_200/0.08)] bg-white/70 p-1 shadow-sm backdrop-blur-sm">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = active === item.id;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onNavigate(item.id)}
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-300 sm:px-4',
                                        isActive
                                            ? 'bg-[oklch(0.42_0.09_185)] text-white shadow-md'
                                            : 'text-[oklch(0.4_0.02_200)] hover:bg-[oklch(0.22_0.02_200/0.05)] hover:text-[oklch(0.22_0.02_200)]',
                                    )}
                                >
                                    <Icon className="size-4 shrink-0" />
                                    <span className="hidden sm:inline">
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </header>

            <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
                {children}
            </main>
        </div>
    );
}
