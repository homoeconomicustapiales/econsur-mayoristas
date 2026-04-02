import React from 'react';

// Data imports (static JSON → Next.js bundlea en build)
import dataRaw  from '../../data/mayoristas_final.json';
import dataReal from '../../data/mayoristas_real.json';

// Types
import type {
  DashboardNominalData,
  DashboardRealData,
  Cuadro1Point,
  Cuadro4RealPoint,
  Cuadro7RealPoint,
  KpiData,
} from '@/types';
import { formatPct } from '@/utils/calculations';

// Components
import Sidebar               from '@/components/shared/Sidebar';
import KpiCard               from '@/components/kpi/KpiCard';
import MainSeriesChart       from '@/components/charts/MainSeriesChart';
import PaymentMethodsChart   from '@/components/charts/PaymentMethodsChart';
import SalesChannelsChart    from '@/components/charts/SalesChannelsChart';
import SectorEvolutionChart  from '@/components/charts/SectorEvolutionChart';
import RegionalSalesChart    from '@/components/charts/RegionalSalesChart';
import BocasOperacionesChart from '@/components/charts/BocasOperacionesChart';
import FacturacionChart      from '@/components/charts/FacturacionChart';

// ── Helpers ─────────────────────────────────────────────────────────────────

function pct(a: number | null, b: number | null): number | null {
  if (!a || !b || b === 0) return null;
  return ((a / b) - 1) * 100;
}

function buildKpis(nominal: DashboardNominalData, real: DashboardRealData): KpiData[] {
  const c1    = nominal.cuadro_1 as Cuadro1Point[];
  const last  = c1[c1.length - 1];
  const prevM = c1[c1.length - 2];
  const prevY = c1.length >= 13 ? c1[c1.length - 13] : null;

  const indice     = last?.indice_serie_original ?? null;
  const varMensual = pct(indice, prevM?.indice_serie_original ?? null);
  const varAnual   = pct(indice, prevY?.indice_serie_original ?? null);
  const periodos   = c1.length;
  const ultimaFecha = last?.fecha ?? '';
  const [anio, mes] = ultimaFecha.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const labelFecha = ultimaFecha ? `${meses[parseInt(mes, 10) - 1]} ${anio}` : '—';

  // KPI extra: bocas de expendio (último dato disponible)
  const c6 = nominal.cuadro_6 as any[];
  const lastBocas = c6.length ? (c6[c6.length - 1]?.nac_bocas ?? null) : null;

  return [
    {
      label: 'Índice de Ventas (Precios Constantes)',
      value: indice?.toFixed(1) ?? '—',
      unit:  'base 2017=100',
      description: `Último dato: ${labelFecha} · Serie original`,
      trend: 'neutral',
    },
    {
      label: 'Variación Mensual',
      value: formatPct(varMensual),
      trend: varMensual == null ? 'neutral' : varMensual >= 0 ? 'up' : 'down',
      delta: formatPct(varMensual),
      description: 'Respecto al mes anterior',
    },
    {
      label: 'Variación Interanual',
      value: formatPct(varAnual),
      trend: varAnual == null ? 'neutral' : varAnual >= 0 ? 'up' : 'down',
      delta: formatPct(varAnual),
      description: `Respecto a ${labelFecha.replace(anio, String(parseInt(anio, 10) - 1))}`,
    },
    {
      label: 'Bocas de Expendio',
      value: lastBocas != null ? Math.round(lastBocas).toLocaleString('es-AR') : '—',
      unit:  'locales',
      description: `Total País · ${labelFecha}`,
      trend: 'neutral',
    },
  ];
}

// ── Page (Server Component) ──────────────────────────────────────────────────
export default function DashboardPage() {
  const nominal = dataRaw  as unknown as DashboardNominalData;
  const real    = dataReal as unknown as DashboardRealData;

  const kpis = buildKpis(nominal, real);

  const c1Data    = nominal.cuadro_1   as Cuadro1Point[];
  const c4Real    = real.cuadro_4_real as Cuadro4RealPoint[];
  const c5Real    = real.cuadro_5_real as any[];
  const c6Real    = real.cuadro_6_real as any[];
  const c7Real    = real.cuadro_7_real as Cuadro7RealPoint[];
  const ultimaFecha = real.meta?.ultima_fecha ?? '';

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 min-w-0 md:ml-64 p-4 sm:p-6 lg:p-8 space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="pt-10 md:pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Monitor de Autoservicios Mayoristas
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Encuesta de Autoservicios Mayoristas · INDEC Argentina · Datos deflactados con IPI
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-900/40 border border-violet-700/50 text-violet-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                Último dato: {ultimaFecha.slice(0, 7).replace('-', '/')}
              </span>
              <a
                href="https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-35-29"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
              >
                Fuente INDEC ↗
              </a>
            </div>
          </div>
        </header>

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <KpiCard key={i} kpi={kpi} />
          ))}
        </section>

        {/* ── Índices de Actividad ────────────────────────────────────────── */}
        <SectionDivider label="Índices de Actividad" />
        <MainSeriesChart data={c1Data} />

        {/* ── Composición de las Ventas ───────────────────────────────────── */}
        <SectionDivider label="Composición de las Ventas" />
        <PaymentMethodsChart data={c4Real} />
        <SalesChannelsChart  data={c4Real} />

        {/* ── Grupos de Artículos ─────────────────────────────────────────── */}
        <SectionDivider label="Grupos de Artículos y Análisis Estructural" />
        <SectorEvolutionChart data={c5Real} />

        {/* ── Distribución Geográfica ─────────────────────────────────────── */}
        <SectionDivider label="Distribución Geográfica" />
        <RegionalSalesChart data={c5Real} />

        {/* ── Bocas y Operaciones ─────────────────────────────────────────── */}
        <SectionDivider label="Bocas de Expendio y Operaciones" />
        <BocasOperacionesChart data={c6Real} />

        {/* ── Facturación ─────────────────────────────────────────────────── */}
        <SectionDivider label="Facturación por Tipo de Comprobante" />
        <FacturacionChart data={c7Real} />

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer className="text-center py-8 border-t border-slate-800 mt-8">
          <p className="text-xs text-slate-600">
            Fuente: INDEC — Encuesta de Autoservicios Mayoristas.{' '}
            Deflactado con Índice de Precios Implícitos (IPI, Cuadro 2).{' '}
            Elaboración: EconSur.
          </p>
        </footer>
      </main>
    </div>
  );
}

// ── Subcomponente: Divider con label ─────────────────────────────────────────
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-slate-800" />
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}
