import { CameraOff } from 'lucide-react';

type CameraPanelProps = {
    on: boolean;
    destination: number | null;
};

export default function CameraPanel({ on, destination }: CameraPanelProps) {
    return (
        <div>
            <p className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Cámara
            </p>
            <div className="relative aspect-video overflow-hidden rounded-md bg-black/50 ring-1 ring-white/10">
                {on ? (
                    <>
                        <img
                            src="/photos/arquitectura.jpeg"
                            alt="Vista simulada desde el robot"
                            className="size-full object-cover opacity-85"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 py-1 text-[9px] text-white/90">
                            POV · QR{destination ? ` M${destination}` : ''}
                        </div>
                        <span className="absolute top-1.5 left-1.5 size-1.5 animate-pulse rounded-full bg-red-500" />
                    </>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-500">
                        <CameraOff className="size-4" />
                        <span className="text-[10px]">Apagada</span>
                    </div>
                )}
            </div>
        </div>
    );
}
