'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Cuadro4RealPoint, VariationType, DateRange } from '@/types';
import { calcVariacionesMultiSerie, filterByDateRange, formatPct } from '@/utils/calculations';
import DatePicker from '@/components/shared/DatePicker';

interface Props { data: Cuadro4RealPoint[]; }

const KEYS = ['efectivo_corr_real', 'debito_corr_real', 'tarjeta_corr_real', 'otros_corr_real'];
const LABELS: Record<string, string> = {
  efectivo_corr_real: 'Efectivo',
  debito_corr_real:   'Tarjetas de Débito',
  tarjeta_corr_real:  'Tarjetas de Crédito',
  otros_corr_real:    'Otros Medios',
};
const COLORS = ['#60a5fa', '#34d399', '#f59e0b', '#a78bfa'];

const fmtFecha = (f: string) => { const [y, m] = f.split('-'); return `${m}/${y.slice(2)}`; };

export default function PaymentMethodsChart({ data }: Props) {
  const [varType,    setVarType]    = useState<VariationType>('interanual');
  const [dateRange,  setDateRange]  = useState<DateRange>({ from: '2019-01-01', to: '2026-06-01' });
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set(KEYS));

  const chartData = useMemo(() => {
    const variaciones = calcVariacionesMultiSerie(data as any[], KEYS, varType);
    return filterByDateRange(variaciones, dateRange.from, dateRange.to).map((row, index) => ({ ...row, __index: index }));
  }, [data, varType, dateRange]);

  const activeSeries = useMemo(() => KEYS.filter(k => activeKeys.has(k)), [activeKeys]);

  const comparison = useMemo(() => {
    if (!chartData.length) return [];
    return activeSeries.map(key => {
      let current: number | null = null;
      let previous: number | null = null;
      for (let i = chartData.length - 1; i >= 0; i--) {
        const value = (chartData[i] as any)[key] as number | null;
        if (current == null && typeof value === 'number') { current = value; continue; }
        if (current != null && typeof value === 'number') { previous = value; break; }
      }
      return { key, current, diff: current != null && previous != null ? current - previous : null };
    });
  }, [chartData, activeSeries]);

  const toggleKey = (key: string) => {
    setActiveKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size === 1) return prev; next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  return (
    <section id="medios-pago" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Medios de Pago Deflactados</h2>
          <p className="text-sm text-slate-500 mt-0.5">Efectivo · Débito · Crédito · Otros — Cuadro 4 INDEC</p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1 self-start shrink-0">
          {(['interanual', 'mensual'] as VariationType[]).map(t => (
            <button key={t} onClick={() => setVarType(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${varType === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
              {t === 'interanual' ? 'Var. Interanual' : 'Var. Mensual'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {KEYS.map(key => (
          <button key={key} onClick={() => toggleKey(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeKeys.has(key) ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-300 text-slate-500 hover:text-slate-800'}`}>
            {LABELS[key]}
          </button>
        ))}
      </div>

      <DatePicker value={dateRange} onChange={setDateRange} variant="light" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
        {comparison.map(row => (
          <div key={row.key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-600">{LABELS[row.key]}</p>
            <p className="text-sm font-semibold text-slate-900">{formatPct(row.current)}</p>
            <p className="text-xs text-slate-500">vs previo: {formatPct(row.diff)}</p>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={320} className="mt-4">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="fecha" tickFormatter={fmtFecha} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={52} />
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
              const delta = prev != null && typeof v === 'number' ? v - prev : null;
              return [`${formatPct(v)} (${formatPct(delta)} vs previo)`, LABELS[name] ?? name];
            }}
            labelFormatter={fmtFecha}
          />
          <Legend formatter={v => LABELS[v] ?? v} wrapperStyle={{ fontSize: 12, color: '#475569' }} />
          {activeSeries.map((key) => (
            <Line key={key} type="monotone" dataKey={key} stroke={COLORS[KEYS.indexOf(key)]} dot={false} strokeWidth={2} connectNulls={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
