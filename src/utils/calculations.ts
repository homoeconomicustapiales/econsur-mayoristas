import { DataPoint } from '@/types';

/**
 * Variación interanual: (valor_t / valor_{t-12}) - 1
 */
export function calcVariacionInteranual(
  data: DataPoint[],
  key: string
): DataPoint[] {
  return data.map((punto, i) => {
    const valorActual = punto[key] as number | null;
    const puntoAnterior = data[i - 12];
    const valorAnterior = puntoAnterior ? (puntoAnterior[key] as number | null) : null;

    if (
      valorActual == null || valorAnterior == null ||
      valorAnterior === 0 || isNaN(valorActual) || isNaN(valorAnterior)
    ) {
      return { fecha: punto.fecha, [key]: null };
    }

    const variacion = ((valorActual / valorAnterior) - 1) * 100;
    return { fecha: punto.fecha, [key]: parseFloat(variacion.toFixed(2)) };
  }).filter(p => p[key] != null);
}

/**
 * Variación mensual: (valor_t / valor_{t-1}) - 1
 */
export function calcVariacionMensual(
  data: DataPoint[],
  key: string
): DataPoint[] {
  return data.map((punto, i) => {
    const valorActual = punto[key] as number | null;
    const puntoAnterior = data[i - 1];
    const valorAnterior = puntoAnterior ? (puntoAnterior[key] as number | null) : null;

    if (
      i === 0 || valorActual == null || valorAnterior == null ||
      valorAnterior === 0 || isNaN(valorActual) || isNaN(valorAnterior)
    ) {
      return { fecha: punto.fecha, [key]: null };
    }

    const variacion = ((valorActual / valorAnterior) - 1) * 100;
    return { fecha: punto.fecha, [key]: parseFloat(variacion.toFixed(2)) };
  }).filter(p => p[key] != null);
}

/**
 * Calcula variaciones para múltiples series simultáneamente.
 */
export function calcVariacionesMultiSerie(
  data: DataPoint[],
  keys: string[],
  tipo: 'interanual' | 'mensual'
): DataPoint[] {
  const lag = tipo === 'interanual' ? 12 : 1;

  return data.map((punto, i) => {
    const rec: DataPoint = { fecha: punto.fecha };
    keys.forEach(key => {
      const valorActual = punto[key] as number | null;
      const puntoAnterior = data[i - lag];
      const valorAnterior = puntoAnterior ? (puntoAnterior[key] as number | null) : null;

      if (
        valorActual == null || valorAnterior == null ||
        valorAnterior === 0 || isNaN(valorActual as number) || isNaN(valorAnterior as number)
      ) {
        rec[key] = null;
      } else {
        rec[key] = parseFloat((((valorActual / valorAnterior) - 1) * 100).toFixed(2));
      }
    });
    return rec;
  }).filter(p => keys.some(k => p[k] != null));
}

/**
 * Reindexar una serie a base 100 desde la fecha de inicio del rango.
 */
export function calcBase100(
  data: DataPoint[],
  key: string,
  baseIndex = 0
): DataPoint[] {
  const baseValue = data[baseIndex]?.[key] as number | null;
  if (baseValue == null || baseValue === 0) return data;

  return data.map(punto => {
    const val = punto[key] as number | null;
    if (val == null) return { fecha: punto.fecha, [key]: null };
    return { fecha: punto.fecha, [key]: parseFloat(((val / baseValue) * 100).toFixed(2)) };
  });
}

/**
 * Calcula base 100 para múltiples series.
 */
export function calcBase100MultiSerie(
  data: DataPoint[],
  keys: string[],
  baseIndex = 0
): DataPoint[] {
  const baseValues: Record<string, number | null> = {};
  keys.forEach(k => {
    baseValues[k] = data[baseIndex]?.[k] as number | null;
  });

  return data.map(punto => {
    const rec: DataPoint = { fecha: punto.fecha };
    keys.forEach(k => {
      const base = baseValues[k];
      const val = punto[k] as number | null;
      if (base == null || base === 0 || val == null) {
        rec[k] = null;
      } else {
        rec[k] = parseFloat(((val / base) * 100).toFixed(2));
      }
    });
    return rec;
  });
}

/**
 * Filtra un array de DataPoints por rango de fechas YYYY-MM-DD.
 */
export function filterByDateRange(
  data: DataPoint[],
  from?: string,
  to?: string
): DataPoint[] {
  return data.filter(p => {
    if (from && p.fecha < from) return false;
    if (to && p.fecha > to) return false;
    return true;
  });
}

/**
 * Formatea un valor numérico como porcentaje con signo.
 */
export function formatPct(val: number | null | undefined, decimals = 1): string {
  if (val == null || isNaN(val)) return '—';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(decimals)}%`;
}

/**
 * Formatea miles de pesos.
 */
export function formatMiles(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '—';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(val);
}

/**
 * Obtiene el último valor numérico válido de una serie para una clave.
 */
export function getLastValue(data: DataPoint[], key: string): number | null {
  for (let i = data.length - 1; i >= 0; i--) {
    const v = data[i][key];
    if (typeof v === 'number' && !isNaN(v)) return v;
  }
  return null;
}
