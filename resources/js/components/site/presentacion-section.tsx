import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const photos = [
    {
        src: '/photos/arquitectura.jpeg',
        alt: 'Arquitectura realista del Robot Mesero escolar: estructura física, sistema y flujo de proceso',
        title: 'Arquitectura del sistema',
        caption:
            'Robot de 3 bandejas con ESP32-S3-CAM, sensores de proximidad y control web por WiFi.',
        featured: true,
    },
    {
        src: '/photos/esp32-cam-hc-sr04.png',
        alt: 'Conexión paso a paso ESP32-CAM con sensor ultrasónico HC-SR04 y divisor de voltaje',
        title: 'Visión y proximidad',
        caption:
            'ESP32-CAM + HC-SR04: lectura de QR y detección de obstáculos con divisor de voltaje seguro.',
        featured: false,
    },
    {
        src: '/photos/planos-conexion-motores-robot.png',
        alt: 'Plano de conexión de motores del robot con drivers BTS7960 y batería 12V',
        title: 'Tracción y potencia',
        caption:
            'Batería 12V, drivers BTS7960 y motores con encoder controlados desde el ESP32.',
        featured: false,
    },
] as const;

const highlights = [
    'QR en mesas',
    'Sensor de proximidad',
    'Control web Laravel',
] as const;

type Photo = (typeof photos)[number];

function ImageLightbox({
    photos: items,
    index,
    onClose,
    onChange,
}: {
    photos: readonly Photo[];
    index: number;
    onClose: () => void;
    onChange: (index: number) => void;
}) {
    const photo = items[index];
    const total = items.length;

    const goPrev = useCallback(() => {
        onChange((index - 1 + total) % total);
    }, [index, onChange, total]);

    const goNext = useCallback(() => {
        onChange((index + 1) % total);
    }, [index, onChange, total]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'ArrowLeft') goPrev();
            if (event.key === 'ArrowRight') goNext();
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [goNext, goPrev, onClose]);

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex flex-col bg-[oklch(0.18_0.01_200/0.94)] animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label={photo.title}
        >
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                        {photo.title}
                    </p>
                    <p className="truncate text-xs text-white/55">
                        {photo.caption}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
                    aria-label="Cerrar"
                >
                    <X className="size-5" />
                </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-12 sm:px-16">
                {total > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={goPrev}
                            className="absolute left-2 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white transition hover:bg-black/55 sm:left-4"
                            aria-label="Imagen anterior"
                        >
                            <ChevronLeft className="size-6" />
                        </button>
                        <button
                            type="button"
                            onClick={goNext}
                            className="absolute right-2 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white transition hover:bg-black/55 sm:right-4"
                            aria-label="Imagen siguiente"
                        >
                            <ChevronRight className="size-6" />
                        </button>
                    </>
                )}

                <button
                    type="button"
                    className="absolute inset-0 cursor-default"
                    aria-label="Cerrar visor"
                    onClick={onClose}
                />

                <img
                    src={photo.src}
                    alt={photo.alt}
                    className="relative z-[1] max-h-[min(78vh,920px)] max-w-full object-contain shadow-2xl animate-in zoom-in-95 duration-200"
                    onClick={(event) => event.stopPropagation()}
                />
            </div>

            <div className="flex flex-col items-center gap-3 px-4 pb-5 pt-2">
                <p className="text-sm font-medium text-white/80">
                    {index + 1} de {total}
                </p>

                <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                    {items.map((item, itemIndex) => {
                        const active = itemIndex === index;

                        return (
                            <button
                                key={item.src}
                                type="button"
                                onClick={() => onChange(itemIndex)}
                                className={`size-14 shrink-0 overflow-hidden rounded-md border-2 transition sm:size-16 ${
                                    active
                                        ? 'border-[oklch(0.72_0.12_185)] opacity-100'
                                        : 'border-transparent opacity-55 hover:opacity-85'
                                }`}
                                aria-label={`Ver ${item.title}`}
                                aria-current={active ? 'true' : undefined}
                            >
                                <img
                                    src={item.src}
                                    alt=""
                                    className="size-full object-cover"
                                />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body,
    );
}

export default function PresentacionSection() {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const hero = photos.find((photo) => photo.featured)!;
    const gallery = photos.filter((photo) => !photo.featured);
    const heroIndex = photos.findIndex((photo) => photo.featured);

    return (
        <section className="animate-in fade-in slide-in-from-bottom-3 space-y-12 duration-500">
            <div className="grid items-end gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
                <div className="space-y-7">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.42_0.09_185/0.2)] bg-[oklch(0.42_0.09_185/0.08)] px-3 py-1 text-xs font-semibold tracking-[0.14em] text-[oklch(0.42_0.09_185)] uppercase">
                        Presentación del proyecto
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-5xl leading-[0.95] font-semibold tracking-tight text-[oklch(0.22_0.02_200)] sm:text-6xl md:text-7xl">
                            Robot
                            <span className="block text-[oklch(0.42_0.09_185)]">
                                Mesero
                            </span>
                        </h1>
                        <p className="max-w-xl text-lg leading-relaxed text-[oklch(0.45_0.02_200)]">
                            Demo escolar con pedido web, navegación por QR y
                            freno automático por proximidad.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                        {highlights.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full border border-[oklch(0.22_0.02_200/0.1)] bg-white/80 px-3.5 py-1.5 text-sm font-medium text-[oklch(0.3_0.02_200)] shadow-sm"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                <figure className="relative">
                    <div className="absolute -inset-3 animate-pulse rounded-[2rem] bg-[oklch(0.55_0.1_185/0.12)] blur-2xl" />
                    <button
                        type="button"
                        onClick={() => setLightboxIndex(heroIndex)}
                        className="group relative block w-full overflow-hidden rounded-[1.75rem] border border-[oklch(0.22_0.02_200/0.08)] bg-white text-left shadow-[0_30px_80px_-35px_oklch(0.42_0.09_185/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.42_0.09_185)] focus-visible:ring-offset-2"
                        aria-label={`Ampliar ${hero.title}`}
                    >
                        <img
                            src={hero.src}
                            alt={hero.alt}
                            className="h-auto w-full object-cover object-top transition duration-300 group-hover:scale-[1.015]"
                        />
                        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 group-focus-visible:opacity-100">
                            <ZoomIn className="size-3.5" />
                            Ampliar
                        </span>
                    </button>
                    <figcaption className="mt-3 text-sm text-[oklch(0.45_0.02_200)]">
                        {hero.caption}
                    </figcaption>
                </figure>
            </div>

            <div className="space-y-5">
                <div className="space-y-2">
                    <p className="text-xs font-semibold tracking-[0.14em] text-[oklch(0.42_0.09_185)] uppercase">
                        Hardware y conexiones
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight text-[oklch(0.22_0.02_200)]">
                        Del plano al robot
                    </h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {gallery.map((photo) => {
                        const photoIndex = photos.findIndex(
                            (item) => item.src === photo.src,
                        );

                        return (
                            <figure key={photo.src} className="space-y-3">
                                <button
                                    type="button"
                                    onClick={() => setLightboxIndex(photoIndex)}
                                    className="group relative block w-full overflow-hidden rounded-2xl border border-[oklch(0.22_0.02_200/0.08)] bg-white text-left shadow-sm transition duration-500 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.42_0.09_185)] focus-visible:ring-offset-2"
                                    aria-label={`Ampliar ${photo.title}`}
                                >
                                    <img
                                        src={photo.src}
                                        alt={photo.alt}
                                        className="h-auto w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                                        loading="lazy"
                                    />
                                    <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 group-focus-visible:opacity-100">
                                        <ZoomIn className="size-3.5" />
                                        Ampliar
                                    </span>
                                </button>
                                <figcaption className="space-y-1 px-0.5">
                                    <p className="font-medium text-[oklch(0.22_0.02_200)]">
                                        {photo.title}
                                    </p>
                                    <p className="text-sm leading-relaxed text-[oklch(0.45_0.02_200)]">
                                        {photo.caption}
                                    </p>
                                </figcaption>
                            </figure>
                        );
                    })}
                </div>
            </div>

            <div className="grid gap-6 border-t border-[oklch(0.22_0.02_200/0.1)] pt-8 sm:grid-cols-3">
                {[
                    {
                        step: '01',
                        title: 'Pedido web',
                        text: 'Se crea el pedido y se elige la mesa desde Laravel.',
                    },
                    {
                        step: '02',
                        title: 'Navegación QR',
                        text: 'El ESP32-CAM busca el código QR de la mesa destino.',
                    },
                    {
                        step: '03',
                        title: 'Entrega segura',
                        text: 'El ultrasónico frena ante obstáculos y el robot regresa.',
                    },
                ].map((item) => (
                    <div key={item.step} className="space-y-2">
                        <p className="text-xs font-semibold tracking-[0.16em] text-[oklch(0.42_0.09_185)]">
                            {item.step}
                        </p>
                        <h3 className="font-semibold text-[oklch(0.22_0.02_200)]">
                            {item.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-[oklch(0.45_0.02_200)]">
                            {item.text}
                        </p>
                    </div>
                ))}
            </div>

            {lightboxIndex !== null && (
                <ImageLightbox
                    photos={photos}
                    index={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onChange={setLightboxIndex}
                />
            )}
        </section>
    );
}
