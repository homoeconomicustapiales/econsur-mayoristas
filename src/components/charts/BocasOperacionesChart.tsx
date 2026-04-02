'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  BarChart, Bar,
} from 'recharts';
import { DataPoint, VariationType, DateRange } from '@/types';
import { calcVariacionesMultiSerie, filterByDateRange, formatPct } from '@/utils/calculations';
import DatePicker from '@/components/shared/DatePicker';

interface Props { data: DataPoint[]; }

const JURIS_KEYS = ['nac', 'caba', 'gba', 'resto'] as const;
const JURIS_LABELS: Record<string, string> = {
  nac: 'Total País', caba: 'CABA', gba: 'GBA (24 partidos)', resto: 'Resto del País',
};
const JURIS_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed'];

type MetricaKey = 'ventas_real' | 'bocas' | 'ventas_por_boca_real' | 'ventas_m2_real' | 'operaciones' | 'ventas_por_op_real';
const METRICAS: { key: MetricaKey; label: string; unit: string; deflactado: boolean }[] = [
  { key: 'ventas_real',         label: 'Ventas Totales (const.)',     unit: '$',   deflactado: true  },
  { key: 'bocas',               label: 'Bocas de Expendio',          unit: 'un.', deflactado: false },
  { key: 'ventas_por_boca_real',label: 'Ventas por Boca (const.)',   unit: '$',   deflactado: true  },
  { key: 'ventas_m2_real',      label: 'Ventas por m² (const.)',     unit: '$',   deflactado: true  },
  { key: 'operaciones',         label: 'Cantidad de Operaciones',     unit: 'un.', deflactado: false },
  { key: 'ventas_por_op_real',  label: 'Ventas por Operación (const.)', unit: '$', deflactado: true },
];

const fmtFecha = (f: string) => { const [y, m] = f.split('-'); return `${m}/${y.slice(2)}`; };
const fmtNum = (v: number) => {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toFixed(0);
};

type ViewMode = 'linea' | 'variacion';

export default function BocasOperacionesChart({ data }: Props) {
  const [viewMode,    setViewMode]    = useState<ViewMode>('variacion');
  const [varType,     setVarType]     = useState<VariationType>('interanual');
  const [dateRange,   setDateRange]   = useState<DateRange>({ from: '2019-01-01', to: '2026-06-01' });
  const [selMetrica,  setSelMetrica]  = useState<MetricaKey>('bocas');
  const [activeJuris, setActiveJuris] = useState<Set<string>>(new Set(JURIS_KEYS));

  const metricaInfo = METRICAS.find(m => m.key === selMetrica)!;
  const activeKeys  = useMemo(
    () => JURIS_KEYS.filter(j => activeJuris.has(j)).map(j => `${j}_${selMetrica}`),
    [activeJuris, selMetrica]
  );

  const chartData = useMemo(() => {
    if (viewMode === 'linea') {
      return filterByDateRange(data, dateRange.from, dateRange.to).map((row, i) => ({ ...row, __index: i }));
    }
    const variaciones = calcVariacionesMultiSerie(data, activeKeys, varType);
    return filterByDateRange(variaciones, dateRange.from, dateRange.to).map((row, i) => ({ ...row, __index: i }));
  }, [data, viewMode, varType, dateRange, activeKeys]);

  const comparison = useMemo(() => {
    if (!chartData.length) return [];
    return JURIS_KEYS.filter(j => activeJuris.has(j)).map(j => {
      const key = `${j}_${selMetrica}`;
      let current: number | null = null;
      let previous: number | null = null;
      for (let i = chartData.length - 1; i >= 0; i--) {
        const v = (chartData[i] as any)[key] as number | null;
        if (current == null && typeof v === 'number') { current = v; continue; }
        if (current != null && typeof v === 'number') { previous = v; break; }
      }
      return { jur: j, label: JURIS_LABELS[j], current, diff: current != null && previous != null ? current - previous : null };
    });
  }, [chartData, activeJuris, selMetrica]);

  const toggleJur = (j: string) => {
    setActiveJuris(prev => {
      const next = new Set(prev);
      if (next.has(j)) { if (next.size === 1) return prev; next.delete(j); } else { next.add(j); }
      return next;
    });
  };

  const isVariacion = viewMode === 'variacion';

  return (
    <section id="bocas-operaciones" className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Bocas de Expendio y Operaciones</h2>
          <p className="text-sm text-slate-500 mt-0.5">Cantidad de locales, superficie y ticket promedio — Cuadro 6 INDEC</p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1 self-start shrink-0">
          {(['linea', 'variacion'] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === m ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
              {m === 'linea' ? 'Nivel' : 'Variación'}
            </button>
          ))}
          {isVariacion && (['interanual', 'mensual'] as VariationType[]).map(t => (
            <button key={t} onClick={() => setVarType(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${varType === t ? 'bg-violet-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
              {t === 'interanual' ? 'i.a.' : 'm/m'}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de métrica */}
      <div className="flex flex-wrap gap-2">
        {METRICAS.map(m => (
          <button key={m.key} onClick={() => setSelMetrica(m.key)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              selMetrica === m.key ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'}`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Toggle jurisdicciones */}
      <div className="flex flex-wrap gap-2">
        {JURIS_KEYS.map(j => (
          <button key={j} onClick={() => toggleJur(j)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeJuris.has(j) ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-300 text-slate-500'}`}>
            {JURIS_LABELS[j]}
          </button>
        ))}
      </div>

      <DatePicker value={dateRange} onChange={setDateRange} variant="light" />

      {/* Mini KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
        {comparison.map(row => (
          <div key={row.jur} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-600 truncate">{row.label}</p>
            <p className="text-sm font-semibold text-slate-900">
              {isVariacion ? formatPct(row.current) : (row.current != null ? fmtNum(row.current) : '—')}
            </p>
            <p className="text-xs text-slate-500">
              {isVariacion ? `vs previo: ${formatPct(row.diff)}` : metricaInfo.unit}
            </p>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="fecha" tickFormatter={fmtFecha} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={56}
            tickFormatter={(v: number) => isVariacion ? `${v}%` : fmtNum(v)}
          />
          {isVariacion && <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />}
          <Tooltip
            contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8 }}
            labelStyle={{ color: '#0f172a', fontWeight: 600 }}
            formatter={(v: number, name: string) => {
              const jur = (name as string).split('_')[0];
              const label = JURIS_LABELS[jur] ?? name;
              const display = isVariacion ? formatPct(v) : `${fmtNum(v)} ${metricaInfo.unit}`;
              return [display, label];
            }}
            labelFormatter={fmtFecha}
          />
          <Legend
            formatter={name => JURIS_LABELS[(name as string).split('_')[0]] ?? name}
            wrapperStyle={{ fontSize: 12, color: '#475569' }}
          />
          {JURIS_KEYS.filter(j => activeJuris.has(j)).map((j, i) => (
            <Line key={j} type="monotone" dataKey={`${j}_${selMetrica}`}
              stroke={JURIS_COLORS[i]} dot={false} strokeWidth={2.2} connectNulls={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
