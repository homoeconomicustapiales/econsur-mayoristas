'use client';

import React, { useMemo, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Cuadro7RealPoint, VariationType, DateRange } from '@/types';
import { calcVariacionesMultiSerie, filterByDateRange, formatPct } from '@/utils/calculations';
import DatePicker from '@/components/shared/DatePicker';

interface Props { data: Cuadro7RealPoint[]; }

const KEYS   = ['fact_total_real', 'fact_tipo_a_real', 'fact_tipo_b_real'];
const LABELS: Record<string, string> = {
  fact_total_real:  'Total (A + B)',
  fact_tipo_a_real: 'Tipo "A" (empresas)',
  fact_tipo_b_real: 'Tipo "B" (consumidor final)',
};
const COLORS = ['#0f172a', '#2563eb', '#059669'];

const fmtFecha = (f: string) => { const [y, m] = f.split('-'); return `${m}/${y.slice(2)}`; };
const fmtM = (v: number) => {
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}B`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}M`;
  return `$${v.toFixed(0)}M`;
};

type ViewMode = 'nivel' | 'variacion' | 'composicion';

export default function FacturacionChart({ data }: Props) {
  const [viewMode,   setViewMode]   = useState<ViewMode>('variacion');
  const [varType,    setVarType]    = useState<VariationType>('interanual');
  const [dateRange,  setDateRange]  = useState<DateRange>({ from: '2019-01-01', to: '2026-06-01' });
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set(KEYS));

  const activeSeries = useMemo(() => KEYS.filter(k => activeKeys.has(k)), [activeKeys]);

  const chartData = useMemo(() => {
    if (viewMode === 'nivel' || viewMode === 'composicion') {
      return filterByDateRange(data as any[], dateRange.from, dateRange.to).map((row, i) => ({ ...row, __index: i }));
    }
    const variaciones = calcVariacionesMultiSerie(data as any[], KEYS, varType);
    return filterByDateRange(variaciones, dateRange.from, dateRange.to).map((row, i) => ({ ...row, __index: i }));
  }, [data, viewMode, varType, dateRange]);

  // Para composición: porcentaje de A y B sobre total
  const composicionData = useMemo(() => {
    if (viewMode !== 'composicion') return [];
    return chartData.map(row => {
      const total = (row as any)['fact_total_real'] as number | null;
      const a     = (row as any)['fact_tipo_a_real'] as number | null;
      const b     = (row as any)['fact_tipo_b_real'] as number | null;
      if (!total || total === 0) return { fecha: row.fecha, tipo_a_pct: null, tipo_b_pct: null };
      return {
        fecha: row.fecha,
        tipo_a_pct: a != null ? Number(((a / total) * 100).toFixed(2)) : null,
        tipo_b_pct: b != null ? Number(((b / total) * 100).toFixed(2)) : null,
      };
    });
  }, [chartData, viewMode]);

  const comparison = useMemo(() => {
    const src = viewMode === 'composicion' ? composicionData : chartData;
    if (!src.length) return [];
    const keys = viewMode === 'composicion' ? ['tipo_a_pct', 'tipo_b_pct'] : activeSeries;
    return (keys as string[]).map(key => {
      let current: number | null = null;
      for (let i = src.length - 1; i >= 0; i--) {
        const v = (src[i] as any)[key] as number | null;
        if (typeof v === 'number') { current = v; break; }
      }
      const label = viewMode === 'composicion'
        ? (key === 'tipo_a_pct' ? 'Tipo "A" (% del total)' : 'Tipo "B" (% del total)')
        : (LABELS[key] ?? key);
      return { key, label, current };
    });
  }, [chartData, composicionData, activeSeries, viewMode]);

  const toggleKey = (key: string) => {
    setActiveKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size === 1) return prev; next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  return (
    <section id="facturacion" className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Facturación por Tipo de Comprobante</h2>
          <p className="text-sm text-slate-500 mt-0.5">Comprobantes A (empresas) y B (consumidor final) — Cuadro 7 INDEC</p>
        </div>
        {viewMode === 'variacion' && (
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
          ['variacion',    'Variación (%)'],
          ['nivel',        'Nivel (const.)'],
          ['composicion',  'Composición (%)'],
        ] as const).map(([m, label]) => (
          <button key={m} onClick={() => setViewMode(m)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
              viewMode === m ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'}`}>
            {label}
          </button>
        ))}
      </div>

      {viewMode !== 'composicion' && (
        <div className="flex flex-wrap gap-2">
          {KEYS.map(key => (
            <button key={key} onClick={() => toggleKey(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                activeKeys.has(key) ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-300 text-slate-500'}`}>
              {LABELS[key]}
            </button>
          ))}
        </div>
      )}

      <DatePicker value={dateRange} onChange={setDateRange} variant="light" />

      {/* Mini KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
        {comparison.map(row => (
          <div key={row.key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-600 truncate">{row.label}</p>
            <p className="text-sm font-semibold text-slate-900">
              {viewMode === 'nivel' ? fmtM(row.current ?? 0)
               : viewMode === 'composicion' ? `${(row.current ?? 0).toFixed(1)}%`
               : formatPct(row.current)}
            </p>
          </div>
        ))}
      </div>

      {viewMode === 'composicion' ? (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={composicionData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="fecha" tickFormatter={fmtFecha} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={48} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8 }}
              labelStyle={{ color: '#0f172a', fontWeight: 600 }}
              formatter={(v: number, name: string) => [
                `${(v ?? 0).toFixed(1)}%`,
                name === 'tipo_a_pct' ? 'Tipo "A"' : 'Tipo "B"',
              ]}
              labelFormatter={fmtFecha}
            />
            <Legend formatter={name => name === 'tipo_a_pct' ? 'Tipo "A" (empresas)' : 'Tipo "B" (consumidor final)'} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="tipo_b_pct" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} name="tipo_b_pct" />
            <Bar dataKey="tipo_a_pct" stackId="a" fill="#2563eb" radius={[3, 3, 0, 0]} name="tipo_a_pct" />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="fecha" tickFormatter={fmtFecha} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} interval="preserveStartEnd" />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={54}
              tickFormatter={(v: number) => viewMode === 'nivel' ? fmtM(v) : `${v}%`}
            />
            {viewMode === 'variacion' && <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />}
            <Tooltip
              contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8 }}
              labelStyle={{ color: '#0f172a', fontWeight: 600 }}
              formatter={(v: number, name: string) => [
                viewMode === 'nivel' ? fmtM(v) : formatPct(v),
                LABELS[name] ?? name,
              ]}
              labelFormatter={fmtFecha}
            />
            <Legend formatter={name => LABELS[name] ?? name} wrapperStyle={{ fontSize: 12, color: '#475569' }} />
            {activeSeries.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key}
                stroke={COLORS[KEYS.indexOf(key)]}
                dot={false} strokeWidth={key === 'fact_total_real' ? 2.8 : 2}
                strokeDasharray={key === 'fact_total_real' ? undefined : '4 2'}
                connectNulls={false} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <p className="text-xs text-slate-400">
        <strong>Nota:</strong> Tipo &quot;A&quot; corresponde a operaciones entre empresas (B2B).
        Tipo &quot;B&quot; corresponde a ventas al consumidor final. Valores deflactados con IPI (Cuadro 2).
      </p>
    </section>
  );
}
