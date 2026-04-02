'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell,
} from 'recharts';
import { DataPoint, VariationType, DateRange, LABEL_JURISDICCION } from '@/types';
import { calcVariacionesMultiSerie, filterByDateRange, formatPct } from '@/utils/calculations';
import DatePicker from '@/components/shared/DatePicker';

interface Props { data: DataPoint[]; }

const JURIS = [
  { key: 'nac_total_real',   label: 'Total País' },
  { key: 'caba_total_real',  label: 'CABA' },
  { key: 'gba_total_real',   label: 'GBA (24 partidos)' },
  { key: 'resto_total_real', label: 'Resto del País' },
];

const GRUPOS = [
  'bebidas', 'almacen', 'panaderia', 'lacteos', 'carnes',
  'verduras', 'limpieza', 'indumentaria', 'electronicos', 'otros',
] as const;

const LABELS_GRUPO: Record<string, string> = {
  bebidas: 'Bebidas', almacen: 'Almacén', panaderia: 'Panadería', lacteos: 'Lácteos',
  carnes: 'Carnes', verduras: 'Verdulería', limpieza: 'Limpieza y Perf.', indumentaria: 'Indumentaria',
  electronicos: 'Electrónicos', otros: 'Otros',
};

const PALETTE_JURIS  = ['#2563eb', '#059669', '#d97706', '#7c3aed'];
const PALETTE_GRUPOS = [
  '#0ea5e9', '#22c55e', '#f97316', '#ec4899', '#8b5cf6',
  '#14b8a6', '#ef4444', '#84cc16', '#6366f1', '#f59e0b',
];

const fmtFecha = (f: string) => { const [y, m] = f.split('-'); return `${m}/${y.slice(2)}`; };

type ViewMode = 'jurisdicciones' | 'grupos_por_jur' | 'variacion_relativa';

export default function RegionalSalesChart({ data }: Props) {
  const [varType,   setVarType]   = useState<VariationType>('interanual');
  const [dateRange, setDateRange] = useState<DateRange>({ from: '2019-01-01', to: '2026-06-01' });
  const [viewMode,  setViewMode]  = useState<ViewMode>('jurisdicciones');
  const [selJur,    setSelJur]    = useState<string>('nac');
  const [activeJuris, setActiveJuris] = useState<Set<string>>(new Set(JURIS.map(j => j.key)));

  // Series activas según modo
  const grupoSeries = useMemo(() =>
    GRUPOS.map(g => ({ key: `${selJur}_${g}_real`, label: LABELS_GRUPO[g] ?? g })),
    [selJur]
  );
  const activeSeries = viewMode === 'grupos_por_jur' ? grupoSeries : JURIS.filter(j => activeJuris.has(j.key));

  const chartData = useMemo(() => {
    if (viewMode === 'variacion_relativa') return [];
    const keys = activeSeries.map(s => s.key);
    const variaciones = calcVariacionesMultiSerie(data, keys, varType);
    return filterByDateRange(variaciones, dateRange.from, dateRange.to).map((row, index) => ({ ...row, __index: index }));
  }, [data, viewMode, activeSeries, varType, dateRange]);

  const labelMap = Object.fromEntries(activeSeries.map(s => [s.key, s.label]));

  // Comparación últimas variaciones
  const comparison = useMemo(() => {
    if (!chartData.length || viewMode === 'variacion_relativa') return [];
    return activeSeries.slice(0, 8).map(s => {
      let current: number | null = null;
      let previous: number | null = null;
      for (let i = chartData.length - 1; i >= 0; i--) {
        const value = (chartData[i] as any)[s.key] as number | null;
        if (current == null && typeof value === 'number') { current = value; continue; }
        if (current != null && typeof value === 'number') { previous = value; break; }
      }
      return { key: s.key, label: s.label, current, diff: current != null && previous != null ? current - previous : null };
    });
  }, [chartData, activeSeries, viewMode]);

  // Variación relativa acumulada
  const relativeData = useMemo(() => {
    const filtered = filterByDateRange(data, dateRange.from, dateRange.to);
    if (!filtered.length) return [];
    const allSeries = [
      ...JURIS,
      ...GRUPOS.map(g => ({ key: `nac_${g}_real`, label: `Nac. ${LABELS_GRUPO[g]}` })),
    ];
    return allSeries.map(s => {
      let first: number | null = null;
      let last: number | null = null;
      for (const row of filtered) {
        const v = (row as any)[s.key] as number | null;
        if (typeof v !== 'number' || !isFinite(v)) continue;
        if (first == null) first = v;
        last = v;
      }
      const acumulado = first && last && first !== 0 ? Number((((last / first) - 1) * 100).toFixed(2)) : null;
      return { key: s.key, label: s.label, value: acumulado, isReference: s.key === 'nac_total_real' };
    }).filter(i => i.value != null).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }, [data, dateRange]);

  const toggleJur = (key: string) => {
    setActiveJuris(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size === 1) return prev; next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const getPalette = (i: number, mode: ViewMode) =>
    mode === 'jurisdicciones' ? PALETTE_JURIS[i % 4] : PALETTE_GRUPOS[i % PALETTE_GRUPOS.length];

  return (
    <section id="jurisdiccion" className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Ventas por Jurisdicción</h2>
          <p className="text-sm text-slate-500 mt-0.5">Deflactadas por IPI — Cuadro 5 INDEC</p>
        </div>
        {viewMode !== 'variacion_relativa' && (
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1 self-start shrink-0">
            {(['interanual', 'mensual'] as VariationType[]).map(t => (
              <button key={t} onClick={() => setVarType(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${varType === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                {t === 'interanual' ? 'Var. Interanual' : 'Var. Mensual'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selector de vista */}
      <div className="flex flex-wrap gap-2">
        {([
          ['jurisdicciones',     'Por Jurisdicción'],
          ['grupos_por_jur',     'Grupos por Jurisdicción'],
          ['variacion_relativa', 'Variación Relativa'],
        ] as const).map(([m, label]) => (
          <button key={m} onClick={() => setViewMode(m)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
              viewMode === m ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Toggle jurisdicciones */}
      {viewMode === 'jurisdicciones' && (
        <div className="flex flex-wrap gap-2">
          {JURIS.map((j, i) => (
            <button key={j.key} onClick={() => toggleJur(j.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                activeJuris.has(j.key) ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-300 text-slate-500'}`}>
              {j.label}
            </button>
          ))}
        </div>
      )}

      {/* Selector de jurisdicción para grupos */}
      {viewMode === 'grupos_por_jur' && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500">Jurisdicción:</span>
          {JURIS.map(j => (
            <button key={j.key} onClick={() => setSelJur(j.key.replace('_total_real', ''))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selJur === j.key.replace('_total_real', '') ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-slate-300 text-slate-600'}`}>
              {j.label}
            </button>
          ))}
        </div>
      )}

      <DatePicker value={dateRange} onChange={setDateRange} variant="light" />

      {/* Mini KPIs */}
      {comparison.length > 0 && viewMode !== 'variacion_relativa' && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
          {comparison.map(row => (
            <div key={row.key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-600 truncate">{row.label}</p>
              <p className="text-sm font-semibold text-slate-900">{formatPct(row.current)}</p>
              <p className="text-xs text-slate-500">vs previo: {formatPct(row.diff)}</p>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'variacion_relativa' ? (
        <div>
          <p className="text-xs text-slate-500 mb-3">Variación acumulada en el período seleccionado. Total País destacado como referencia.</p>
          <ResponsiveContainer width="100%" height={560}>
            <BarChart data={relativeData} layout="vertical" margin={{ top: 5, right: 60, left: 155, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="label" tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} width={150} />
              <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="4 2" />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8 }}
                formatter={(v: number, _n: string, item: any) => [
                  formatPct(v),
                  item?.payload?.isReference ? 'Var. Acumulada · Referencia' : 'Var. Acumulada',
                ]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#64748b', fontSize: 11, formatter: (v: number) => formatPct(v) }}>
                {relativeData.map((entry, i) => (
                  <Cell key={`c-${i}`} fill={entry.isReference ? '#0f172a' : (entry.value ?? 0) >= 0 ? '#2563eb' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="fecha" tickFormatter={fmtFecha} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={52} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
            <Tooltip
              contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8 }}
              labelStyle={{ color: '#0f172a', fontWeight: 600 }}
              formatter={(v: number, name: string, item: any) => {
                const currentIndex = item?.payload?.__index as number | undefined;
                let prev: number | null = null;
                if (typeof currentIndex === 'number') {
                  for (let i = currentIndex - 1; i >= 0; i--) {
                    const cand = (chartData[i] as any)?.[name] as number | null;
                    if (typeof cand === 'number') { prev = cand; break; }
                  }
                }
                const delta = prev != null ? v - prev : null;
                return [`${formatPct(v)} (${formatPct(delta)} vs previo)`, labelMap[name] ?? name];
              }}
              labelFormatter={fmtFecha}
            />
            <Legend formatter={name => labelMap[name] ?? name} wrapperStyle={{ fontSize: 11, color: '#475569' }} />
            {activeSeries.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key}
                stroke={getPalette(i, viewMode)}
                dot={false} strokeWidth={2.2} connectNulls={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
