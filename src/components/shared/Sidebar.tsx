'use client';

import React, { useState } from 'react';
import {
  BarChart2, CreditCard, ShoppingCart, Package,
  MapPin, TrendingUp, Activity, Menu, X, ChevronRight,
  Store, FileText,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '#series-principales', label: 'Series Principales',        icon: BarChart2  },
  { href: '#medios-pago',        label: 'Medios de Pago',            icon: CreditCard },
  { href: '#canales-venta',      label: 'Canales de Venta',          icon: ShoppingCart },
  { href: '#grupos-articulos',   label: 'Grupos por Artículos',      icon: Package    },
  { href: '#jurisdiccion',       label: 'Ventas por Jurisdicción',   icon: MapPin     },
  { href: '#bocas-operaciones',  label: 'Bocas y Operaciones',       icon: Store      },
  { href: '#facturacion',        label: 'Facturación',               icon: FileText   },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-slate-800 border border-slate-700 text-white p-2 rounded-lg"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800
        z-40 flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:h-auto
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              ES
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">EconSur</p>
              <p className="text-slate-500 text-xs">Mayoristas · INDEC</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400
                  hover:bg-slate-800 hover:text-white transition-colors group"
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-600 text-center">
            Fuente:{' '}
            <a
              href="https://www.indec.gob.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-500 hover:underline"
            >
              INDEC
            </a>{' '}
            · Datos deflactados con IPI
          </p>
        </div>
      </aside>
    </>
  );
}
