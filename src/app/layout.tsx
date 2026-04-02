import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EconSur · Monitor Mayoristas',
  description:
    'Dashboard de análisis de la Encuesta de Autoservicios Mayoristas del INDEC Argentina. Ventas a precios constantes, medios de pago, canales de venta y distribución geográfica.',
  keywords: ['INDEC', 'mayoristas', 'autoservicios mayoristas', 'economía argentina', 'ventas', 'precios constantes'],
  authors: [{ name: 'EconSur' }],
  openGraph: {
    title: 'EconSur · Monitor Mayoristas INDEC',
    description: 'Visualización interactiva de la Encuesta de Autoservicios Mayoristas — Argentina',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
