import React from 'react';
import { KpiData } from '@/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  kpi: KpiData;
}

export default function KpiCard({ kpi }: KpiCardProps) {
  const trendIcon = () => {
    if (kpi.trend === 'up')      return <TrendingUp  className="w-4 h-4 text-emerald-400" />;
    if (kpi.trend === 'down')    return <TrendingDown className="w-4 h-4 text-rose-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const deltaColor = () => {
    if (kpi.trend === 'up')   return 'text-emerald-400';
    if (kpi.trend === 'down') return 'text-rose-400';
    return 'text-slate-400';
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-1.5 shadow-lg hover:border-slate-500 transition-colors">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
        {kpi.label}
      </p>

      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-white leading-none">
          {kpi.value}
          {kpi.unit && (
            <span className="text-xs font-normal text-slate-400 ml-1">{kpi.unit}</span>
          )}
        </span>
        {kpi.delta && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${deltaColor()}`}>
            {trendIcon()}
            {kpi.delta}
          </div>
        )}
      </div>

      {kpi.description && (
        <p className="text-[11px] text-slate-500 mt-0.5">{kpi.description}</p>
      )}
    </div>
  );
}
