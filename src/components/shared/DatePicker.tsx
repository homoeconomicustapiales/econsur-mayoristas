'use client';

import React from 'react';
import { DateRange } from '@/types';
import { Calendar } from 'lucide-react';

interface DatePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  minDate?: string;
  maxDate?: string;
  variant?: 'dark' | 'light';
}

const PRESETS = [
  { label: '1A',  months: 12 },
  { label: '3A',  months: 36 },
  { label: '5A',  months: 60 },
  { label: 'Todo', months: 0  },
];

export default function DatePicker({
  value,
  onChange,
  minDate = '2017-01-01',
  maxDate = '2026-01-01',
  variant = 'dark',
}: DatePickerProps) {
  const handlePreset = (months: number) => {
    if (months === 0) {
      onChange({ from: minDate, to: maxDate });
      return;
    }
    const to   = new Date(maxDate);
    const from = new Date(to);
    from.setMonth(from.getMonth() - months);
    const fmt = (d: Date) => d.toISOString().slice(0, 7) + '-01';
    onChange({ from: fmt(from), to: fmt(to) });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar className={`w-4 h-4 hidden sm:block ${variant === 'light' ? 'text-slate-500' : 'text-slate-400'}`} />

      <div
        className={`flex items-center gap-1 rounded-lg p-1 ${
          variant === 'light'
            ? 'bg-white border border-slate-300'
            : 'bg-slate-800 border border-slate-700'
        }`}
      >
        <input
          type="month"
          value={value.from.slice(0, 7)}
          min={minDate.slice(0, 7)}
          max={value.to.slice(0, 7)}
          onChange={e => onChange({ ...value, from: e.target.value + '-01' })}
          className={`bg-transparent text-sm border-none outline-none px-2 py-1 cursor-pointer ${
            variant === 'light' ? 'text-slate-700' : 'text-slate-200'
          }`}
        />
        <span className={`text-sm ${variant === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>→</span>
        <input
          type="month"
          value={value.to.slice(0, 7)}
          min={value.from.slice(0, 7)}
          max={maxDate.slice(0, 7)}
          onChange={e => onChange({ ...value, to: e.target.value + '-01' })}
          className={`bg-transparent text-sm border-none outline-none px-2 py-1 cursor-pointer ${
            variant === 'light' ? 'text-slate-700' : 'text-slate-200'
          }`}
        />
      </div>

      <div className="flex gap-1">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => handlePreset(p.months)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              variant === 'light'
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
