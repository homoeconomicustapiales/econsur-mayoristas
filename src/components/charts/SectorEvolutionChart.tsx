'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell,
} from 'recharts';
import { DataPoint, VariationType, DateRange, LABEL_GRUPO, LABEL_JURISDICCION } from '@/types';
import {
  calcVariacionesMultiSerie, filterByDateRange, formatPct,
  calcBase100MultiSerie,
} from '@/utils/calculations';
import DatePicker from '@/components/shared/DatePicker';

interface Props { data: DataPoint[]; }

const JURIS   = ['nac', 'caba', 'gba', 'resto'] as const;
const GRUPOS  = ['bebidas', 'almacen', 'panaderia', 'lacteos', 'carnes', 'verduras', 'limpieza', 'indumentaria', 'electronicos', 'otros'] as const;

const PALETTE_GRUPOS = [
  '#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626',
  '#0891b2', '#65a30d', '#db2777', '#9333ea', '#ea580c',
];
const PALETTE_JURIS = ['#2563eb', '#059669', '#d97706', '#7c3aed'];

const fmtFecha = (f: string) => { const [y, m] = f.split('-'); return `${m}/${y.slice(2)}`; };

type ViewMode = 'grupos' | 'jurisdicciones' | 'base100' | 'variacion_relativa';

export default function SectorEvolutionChart({ data }: Props) {
  const [viewMode,   setViewMode]   = useState<ViewMode>('grupos');
  const [varType,    setVarType]    = useState<VariationType>('interanual');
  const [dateRange,  setDateRange]  = useState<DateRange>({ from: '2019-01-01', to: '2026-06-01' });
  const [selJur,     setSelJur]     = useState<string>('nac');
  const [activeGrupos, setActiveGrupos] = useState<Set<string>>(new Set(GRUPOS));

  // Series para cada modo
  const grupoSeries = useMemo(
    () => GRUPOS.filter(g => activeGrupos.has(g)).map(g => ({ key: `nac_${g}_real`, label: LABEL_GRUPO[g] ?? g })),
    [activeGrupos]
  );

  const jurisSeries = useMemo(
    () => JURIS.map(j => ({ key: `${j}_total_real`, label: LABEL_JURISDICCION[j] ?? j })),
    []
  );

  const base100Series = useMemo(
    () => GRUPOS.map(g => ({ key: `${selJur}_${g}_real`, label: LABEL_GRUPO[g] ?? g })),
    [selJur]
  );

  // Chart data
  const chartData = useMemo(() => {
    let series: { key: string; label: string }[];
    let source: DataPoint[];

    if (viewMode === 'variacion_relativa') return [];

    if (viewMode === 'base100') {
      series = base100Series;
      const keys = series.map(s => s.key);
      const filtered = filterByDateRange(data, dateRange.from, dateRange.to);
      return calcBase100MultiSerie(filtered, keys, 0);
    }

    series = viewMode === 'grupos' ? grupoSeries : jurisSeries;
    const keys = series.map(s => s.key);
    const variaciones = calcVariacionesMultiSerie(data, keys, varType);
    return filterByDateRange(variaciones, dateRange.from, dateRange.to).map((row, index) => ({ ...row, __index: index }));
  }, [data, viewMode, varType, dateRange, grupoSeries, jurisSeries, base100Series]);

  // Variación relativa acumulada
  const relativeData = useMemo(() => {
    if (viewMode !== 'variacion_relativa') return [];
    const filtered = filterByDateRange(data, dateRange.from, dateRange.to);
    if (!filtered.length) return [];

    const allSeries = [
      ...JURIS.map(j => ({ key: `${j}_total_real`, label: LABEL_JURISDICCION[j] })),
      ...GRUPOS.map(g => ({ key: `nac_${g}_real`, label: `Nac. ${LABEL_GRUPO[g]}` })),
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
  }, [data, dateRange, viewMode]);

  const activeSeries = viewMode === 'grupos' ? grupoSeries : viewMode === 'jurisdicciones' ? jurisSeries : base100Series;
  const labelMap = Object.fromEntries(activeSeries.map(s => [s.key, s.label]));

  const toggleGrupo = (g: string) => {
    setActiveGrupos(prev => {
      const next = new Set(prev);
      if (next.has(g)) { if (next.size === 1) return prev; next.delete(g); } else { next.add(g); }
      return next;
    });
  };

  return (
    <section id="grupos-articulos" className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Grupos de Artículos</h2>
          <p className="text-sm text-slate-500 mt-0.5">Ventas deflactadas por categoría — Cuadro 5 INDEC</p>
        </div>
        {viewMode !== 'variacion_relativa' && viewMode !== 'base100' && (
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
          ['grupos',             'Grupos (País)'],
          ['jurisdicciones',     'Jurisdicciones'],
          ['base100',            'Base 100'],
          ['variacion_relativa', 'Variación Relativa'],
        ] as const).map(([m, label]) => (
          <button key={m} onClick={() => setViewMode(m)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
              viewMode === m ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Filtros de grupos */}
      {viewMode === 'grupos' && (
        <div className="flex flex-wrap gap-1.5">
          {GRUPOS.map((g, i) => (
            <button key={g} onClick={() => toggleGrupo(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                activeGrupos.has(g) ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-300 text-slate-500'}`}>
              {LABEL_GRUPO[g]}
            </button>
          ))}
        </div>
      )}

      {/* Selector de jurisdicción para Base 100 */}
      {viewMode === 'base100' && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 self-center">Jurisdicción:</span>
          {JURIS.map(j => (
            <button key={j} onClick={() => setSelJur(j)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selJur === j ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-slate-300 text-slate-600'}`}>
              {LABEL_JURISDICCION[j]}
            </button>
          ))}
          <p className="w-full text-xs text-slate-400">Todos los grupos reindexados a 100 en el inicio del período seleccionado.</p>
        </div>
      )}

      <DatePicker value={dateRange} onChange={setDateRange} variant="light" />

      {viewMode === 'variacion_relativa' ? (
        <div>
          <p className="text-xs text-slate-500 mb-3">Variación acumulada en el período seleccionado (series deflactadas). Total País destacado como referencia.</p>
          <ResponsiveContainer width="100%" height={600}>
            <BarChart data={relativeData} layout="vertical" margin={{ top: 5, right: 60, left: 160, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="label" tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} width={155} />
              <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="4 2" />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8 }}
                formatter={(v: number, _name: string, item: any) => {
                  const isRef = item?.payload?.isReference;
                  return [formatPct(v), isRef ? 'Var. Acumulada · Referencia' : 'Var. Acumulada'];
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#64748b', fontSize: 11, formatter: (v: number) => formatPct(v) }}>
                {relativeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isReference ? '#0f172a' : (entry.value ?? 0) >= 0 ? '#2563eb' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="fecha" tickFormatter={fmtFecha} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} interval="preserveStartEnd" />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={52}
              tickFormatter={(v: number) => viewMode === 'base100' ? v.toFixed(0) : `${v}%`}
            />
            {viewMode !== 'base100' && <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />}
            <Tooltip
              contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8 }}
              labelStyle={{ color: '#0f172a', fontWeight: 600 }}
              formatter={(v: number, name: string) => {
                const label = labelMap[name] ?? name;
                const display = viewMode === 'base100' ? v.toFixed(1) : formatPct(v);
                return [display, label];
              }}
              labelFormatter={fmtFecha}
            />
            <Legend formatter={name => labelMap[name] ?? name} wrapperStyle={{ fontSize: 11, color: '#475569' }} />
            {activeSeries.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key}
                stroke={viewMode === 'jurisdicciones' ? PALETTE_JURIS[i % 4] : PALETTE_GRUPOS[i % PALETTE_GRUPOS.length]}
                dot={false} strokeWidth={2} connectNulls={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
