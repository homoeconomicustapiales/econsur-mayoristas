'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Cuadro1Point, VariationType, DateRange } from '@/types';
import {
  calcVariacionesMultiSerie, filterByDateRange, formatPct,
} from '@/utils/calculations';
import DatePicker from '@/components/shared/DatePicker';

interface Props {
  data: Cuadro1Point[];
}

const SERIES_KEYS = ['indice_serie_original', 'indice_desestacionalizada', 'indice_tendencia_ciclo'];
const SERIES_LABELS: Record<string, string> = {
  indice_serie_original: 'Serie Original',
  indice_desestacionalizada: 'Desestacionalizada',
  indice_tendencia_ciclo: 'Tendencia-Ciclo',
};
const COLORS = {
  indice_serie_original: '#2563eb',
  indice_desestacionalizada: '#059669',
  indice_tendencia_ciclo: '#d97706',
};

type ViewType = 'nivel' | VariationType;

const fmtFecha = (fecha: string) => {
  const [y, m] = fecha.split('-');
  return `${m}/${y.slice(2)}`;
};

export default function MainSeriesChart({ data }: Props) {
  const [viewType, setViewType] = useState<ViewType>('interanual');
  const [dateRange, setDateRange] = useState<DateRange>({ from: '2019-01-01', to: '2026-01-01' });
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set(SERIES_KEYS));

  const chartData = useMemo(() => {
    const source =
      viewType === 'nivel'
        ? (data as any[])
        : calcVariacionesMultiSerie(data, SERIES_KEYS, viewType);

    return filterByDateRange(source, dateRange.from, dateRange.to).map((row, index) => ({
      ...row,
      __index: index,
    }));
  }, [data, viewType, dateRange]);

  const seriesInView = useMemo(() => SERIES_KEYS.filter(k => activeKeys.has(k)), [activeKeys]);
  const isVariacion = viewType !== 'nivel';

  const yDomain = useMemo<[number, number] | ['auto', 'auto']>(() => {
    const values: number[] = [];
    for (const row of chartData) {
      for (const key of seriesInView) {
        const v = (row as any)[key] as number | null;
        if (typeof v === 'number' && Number.isFinite(v)) values.push(v);
      }
    }

    if (!values.length) return ['auto', 'auto'];

    let min = Math.min(...values);
    let max = Math.max(...values);

    const roundStep = (value: number, step: number, mode: 'floor' | 'ceil') => {
      const op = mode === 'floor' ? Math.floor : Math.ceil;
      return op(value / step) * step;
    };

    if (isVariacion) {
      const absMax = Math.max(Math.abs(min), Math.abs(max));
      const step = absMax >= 20 ? 5 : absMax >= 10 ? 2 : absMax >= 5 ? 1 : absMax >= 1 ? 0.5 : 0.1;
      const bounded = roundStep(absMax * 1.12, step, 'ceil');
      return [-bounded, bounded];
    }

    if (min === max) {
      const pad = Math.max(Math.abs(min) * 0.05, 1);
      min -= pad;
      max += pad;
    } else {
      const pad = (max - min) * 0.08;
      min -= pad;
      max += pad;
    }

    const step = max - min > 200 ? 20 : max - min > 100 ? 10 : max - min > 50 ? 5 : 2;
    return [roundStep(min, step, 'floor'), roundStep(max, step, 'ceil')];
  }, [chartData, seriesInView, isVariacion]);

  const comparison = useMemo(() => {
    if (!chartData.length) return [];

    return seriesInView.map(key => {
      let current: number | null = null;
      let previous: number | null = null;

      for (let i = chartData.length - 1; i >= 0; i--) {
        const value = (chartData[i] as any)[key] as number | null;
        if (current == null && typeof value === 'number') {
          current = value;
          continue;
        }
        if (current != null && typeof value === 'number') {
          previous = value;
          break;
        }
      }

      return {
        key,
        current,
        previous,
        diff: current != null && previous != null ? current - previous : null,
      };
    });
  }, [chartData, seriesInView]);

  const toggleKey = (key: string) => {
    setActiveKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <section id="series-principales" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Series Principales - Precios Constantes</h2>
          <p className="text-sm text-slate-500 mt-0.5">Autoservicios Mayoristas · Indice base 2017=100 - Cuadro 1 INDEC</p>
        </div>

        <div className="flex bg-slate-100 rounded-lg p-1 gap-1 self-start">
          {(['nivel', 'interanual', 'mensual'] as const).map(t => (
            <button
              key={t}
              onClick={() => setViewType(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                t === viewType
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'nivel' ? 'Indice' : t === 'interanual' ? 'Var. Interanual' : 'Var. Mensual'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {SERIES_KEYS.map(key => (
          <button
            key={key}
            onClick={() => toggleKey(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeKeys.has(key)
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-white border-slate-300 text-slate-500 hover:text-slate-800'
            }`}
          >
            {SERIES_LABELS[key]}
          </button>
        ))}
      </div>

      <DatePicker value={dateRange} onChange={setDateRange} variant="light" />

      {comparison.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 mt-4">
          {comparison.map(row => (
            <div key={row.key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-600">{SERIES_LABELS[row.key]}</p>
              <p className="text-sm font-semibold text-slate-900">
                {isVariacion ? formatPct(row.current) : row.current?.toFixed(1) ?? '-'}
              </p>
              <p className="text-xs text-slate-500">
                vs periodo anterior: {isVariacion ? formatPct(row.diff) : row.diff?.toFixed(1) ?? '-'}
              </p>
            </div>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={340} className="mt-4">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="fecha"
            tickFormatter={fmtFecha}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => {
              if (!isVariacion) return Number(v).toFixed(0);
              const decimals = Math.abs(v) < 1 ? 2 : 1;
              return `${Number(v).toFixed(decimals)}%`;
            }}
            width={52}
            domain={yDomain}
          />
          {isVariacion && <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />}
          <Tooltip
            contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8 }}
            labelStyle={{ color: '#0f172a', fontWeight: 600 }}
            formatter={(value: number, name: string, item: any) => {
              const currentIndex = item?.payload?.__index as number | undefined;
              let prev: number | null = null;
              if (typeof currentIndex === 'number') {
                for (let i = currentIndex - 1; i >= 0; i--) {
                  const cand = (chartData[i] as any)?.[name] as number | null;
                  if (typeof cand === 'number') {
                    prev = cand;
                    break;
                  }
                }
              }
              const delta = prev != null && typeof value === 'number' ? value - prev : null;
              const main = isVariacion ? formatPct(value) : value?.toFixed(2);
              const extra = isVariacion ? ` (${formatPct(delta)} vs previo)` : ` (${delta?.toFixed(2) ?? '-'} vs previo)`;
              return [`${main}${extra}`, SERIES_LABELS[name] ?? name];
            }}
            labelFormatter={fmtFecha}
          />
          <Legend
            formatter={v => SERIES_LABELS[v] ?? v}
            wrapperStyle={{ fontSize: 12, color: '#475569' }}
          />
          {seriesInView.map(key => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[key as keyof typeof COLORS]}
              dot={false}
              strokeWidth={2}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
