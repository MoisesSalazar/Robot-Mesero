import { Head } from '@inertiajs/react';
import { useState } from 'react';
import CodigoSection from '@/components/site/codigo-section';
import DocumentacionSection from '@/components/site/documentacion-section';
import MenuSection from '@/components/site/menu-section';
import PresentacionSection from '@/components/site/presentacion-section';
import SimulacionSection from '@/components/site/simulacion-section';
import SiteLayout, { type SiteSection } from '@/layouts/site-layout';

const titles: Record<SiteSection, string> = {
    presentacion: 'Presentación del proyecto',
    menu: 'Menú mesero',
    documentacion: 'Documentación',
    simulacion: 'Simulación',
    codigo: 'Código ESP32',
};

export default function Home() {
    const [section, setSection] = useState<SiteSection>('presentacion');

    return (
        <SiteLayout active={section} onNavigate={setSection}>
            <Head title={titles[section]} />

            <div key={section}>
                {section === 'presentacion' && <PresentacionSection />}
                {section === 'menu' && <MenuSection />}
                {section === 'documentacion' && <DocumentacionSection />}
                {section === 'simulacion' && <SimulacionSection />}
                {section === 'codigo' && <CodigoSection />}
            </div>
        </SiteLayout>
    );
}
