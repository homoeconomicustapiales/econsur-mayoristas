// ─────────────────────────────────────────────
// Tipos base
// ─────────────────────────────────────────────
export interface DataPoint {
  fecha: string;
  [key: string]: number | string | null;
}

// ─────────────────────────────────────────────
// Cuadro 1 – Índices de ventas (precios constantes)
// ─────────────────────────────────────────────
export interface Cuadro1Point extends DataPoint {
  indice_serie_original: number;
  indice_desestacionalizada: number;
  indice_tendencia_ciclo: number;
}

// ─────────────────────────────────────────────
// Cuadro 2 – Precios corrientes, constantes e implícitos
// ─────────────────────────────────────────────
export interface Cuadro2Point extends DataPoint {
  indice_precios_corrientes: number;
  indice_precios_constantes: number;
  indice_precios_implicitos: number;
}

// ─────────────────────────────────────────────
// Cuadro 3 – Ventas en millones
// ─────────────────────────────────────────────
export interface Cuadro3Point extends DataPoint {
  ventas_millones_corrientes: number;
  ventas_millones_constantes: number;
}
export interface Cuadro3RealPoint extends DataPoint {
  ventas_millones_corrientes_real: number;
}

// ─────────────────────────────────────────────
// Cuadro 4 – Canales y medios de pago (nominal)
// ─────────────────────────────────────────────
export interface Cuadro4Point extends DataPoint {
  salon_corr: number;
  online_corr: number;
  efectivo_corr: number;
  debito_corr: number;
  tarjeta_corr: number;
  otros_corr: number;
}
export interface Cuadro4RealPoint extends DataPoint {
  salon_corr_real: number;
  online_corr_real: number;
  efectivo_corr_real: number;
  debito_corr_real: number;
  tarjeta_corr_real: number;
  otros_corr_real: number;
}

// ─────────────────────────────────────────────
// Cuadro 5 – Grupos de artículos por jurisdicción
// 4 jurisdicciones × 11 grupos
// ─────────────────────────────────────────────
export type GrupoArticulos =
  | 'total' | 'bebidas' | 'almacen' | 'panaderia' | 'lacteos'
  | 'carnes' | 'verduras' | 'limpieza' | 'indumentaria' | 'electronicos' | 'otros';

export type Jurisdiccion = 'nac' | 'caba' | 'gba' | 'resto';

export interface Cuadro5Point extends DataPoint {
  nac_total: number; nac_bebidas: number; nac_almacen: number; nac_panaderia: number;
  nac_lacteos: number; nac_carnes: number; nac_verduras: number; nac_limpieza: number;
  nac_indumentaria: number; nac_electronicos: number; nac_otros: number;
  caba_total: number; gba_total: number; resto_total: number;
}

// ─────────────────────────────────────────────
// Cuadro 6 – Bocas de expendio y operaciones
// ─────────────────────────────────────────────
export interface Cuadro6Point extends DataPoint {
  nac_ventas: number; nac_bocas: number; nac_ventas_por_boca: number;
  nac_superficie: number; nac_ventas_m2: number; nac_operaciones: number; nac_ventas_por_op: number;
  caba_ventas: number; caba_bocas: number; caba_ventas_por_boca: number;
  caba_superficie: number; caba_ventas_m2: number; caba_operaciones: number; caba_ventas_por_op: number;
  gba_ventas: number; gba_bocas: number; gba_ventas_por_boca: number;
  gba_superficie: number; gba_ventas_m2: number; gba_operaciones: number; gba_ventas_por_op: number;
  resto_ventas: number; resto_bocas: number; resto_ventas_por_boca: number;
  resto_superficie: number; resto_ventas_m2: number; resto_operaciones: number; resto_ventas_por_op: number;
}

// ─────────────────────────────────────────────
// Cuadro 7 – Facturación por tipo de comprobante
// ─────────────────────────────────────────────
export interface Cuadro7Point extends DataPoint {
  fact_total: number;
  fact_tipo_a: number;
  fact_tipo_b: number;
}
export interface Cuadro7RealPoint extends DataPoint {
  fact_total_real: number;
  fact_tipo_a_real: number;
  fact_tipo_b_real: number;
}

// ─────────────────────────────────────────────
// Estructura completa de los JSONs
// ─────────────────────────────────────────────
export interface DashboardNominalData {
  cuadro_1: Cuadro1Point[];
  cuadro_2: Cuadro2Point[];
  cuadro_3: Cuadro3Point[];
  cuadro_4: Cuadro4Point[];
  cuadro_5: Cuadro5Point[];
  cuadro_6: Cuadro6Point[];
  cuadro_7: Cuadro7Point[];
}

export interface DashboardRealData {
  cuadro_3_real: Cuadro3RealPoint[];
  cuadro_4_real: Cuadro4RealPoint[];
  cuadro_5_real: DataPoint[];
  cuadro_6_real: DataPoint[];
  cuadro_7_real: Cuadro7RealPoint[];
  meta: {
    total_periodos: number;
    fecha_inicio: string;
    ultima_fecha: string;
  };
}

// ─────────────────────────────────────────────
// KPI
// ─────────────────────────────────────────────
export interface KpiData {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  delta?: string;
  unit?: string;
  description?: string;
}

// ─────────────────────────────────────────────
// Filtros de fecha y variación
// ─────────────────────────────────────────────
export type VariationType = 'interanual' | 'mensual';

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;
}

// ─────────────────────────────────────────────
// Etiquetas legibles
// ─────────────────────────────────────────────
export const LABEL_GRUPO: Record<string, string> = {
  bebidas:      'Bebidas',
  almacen:      'Almacén',
  panaderia:    'Panadería',
  lacteos:      'Lácteos',
  carnes:       'Carnes',
  verduras:     'Verdulería y Frutería',
  limpieza:     'Limpieza y Perfumería',
  indumentaria: 'Indumentaria y Calzado',
  electronicos: 'Electrónicos',
  otros:        'Otros',
};

export const LABEL_JURISDICCION: Record<string, string> = {
  nac:   'Total País',
  caba:  'CABA',
  gba:   'GBA (24 partidos)',
  resto: 'Resto del País',
};

export const LABEL_METRICA6: Record<string, string> = {
  ventas:          'Ventas Totales',
  bocas:           'Cantidad de Bocas',
  ventas_por_boca: 'Ventas por Boca',
  superficie:      'Superficie (m²)',
  ventas_m2:       'Ventas por m²',
  operaciones:     'Cantidad de Operaciones',
  ventas_por_op:   'Ventas por Operación',
};
