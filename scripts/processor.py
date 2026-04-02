import pandas as pd
import json
import os
import numpy as np

def safe_float(val):
    try:
        v = float(val)
        if np.isnan(v) or np.isinf(v):
            return None
        return round(v, 4)
    except (TypeError, ValueError):
        return None

def procesar_todo(file_path):
    """
    Pipeline ETL para la Encuesta de Autoservicios Mayoristas INDEC.
    Genera:
      1. mayoristas_final.json  → datos nominales (originales)
      2. mayoristas_real.json   → datos deflactados (precios constantes)
    """
    FILAS_A_SALTAR = 5
    FECHA_INICIO   = "2017-01-01"
    DATE_PATTERN   = r"2017|2018|2019|2020|2021|2022|2023|2024|2025|2026"

    if not os.path.exists("data"):
        os.makedirs("data")

    print(f"--- Iniciando procesamiento de {file_path} ---")

    def read_sheet(sheet, usecols, names, key_col=0):
        df = pd.read_excel(file_path, sheet_name=sheet, header=None, skiprows=FILAS_A_SALTAR)
        df = df[df[key_col].astype(str).str.contains(DATE_PATTERN, na=False)].copy()
        df = df.iloc[:, usecols].copy()
        df.columns = names
        return df.reset_index(drop=True)

    # ──────────────────────────────────────────────────────────────
    # 1. DEFLACTOR — Índice de Precios Implícitos (Cuadro 2, col 7)
    # ──────────────────────────────────────────────────────────────
    df_ipi_raw = read_sheet("Cuadro 2.", [0, 7], ["fecha", "ipi"])
    deflactor = pd.to_numeric(df_ipi_raw["ipi"], errors="coerce") / 100
    deflactor = deflactor.reset_index(drop=True)

    # ──────────────────────────────────────────────────────────────
    # 2. CUADRO 1 — Índices de ventas (constantes): original / desest. / tendencia
    # ──────────────────────────────────────────────────────────────
    df1 = read_sheet(
        "Cuadro 1.",
        [0, 1, 5, 8],
        ["fecha", "indice_serie_original", "indice_desestacionalizada", "indice_tendencia_ciclo"]
    )
    for col in ["indice_serie_original", "indice_desestacionalizada", "indice_tendencia_ciclo"]:
        df1[col] = pd.to_numeric(df1[col], errors="coerce")
    df1 = df1.dropna(subset=["indice_serie_original"]).reset_index(drop=True)
    df1["fecha"] = pd.date_range(start=FECHA_INICIO, periods=len(df1), freq="MS").strftime("%Y-%m-%d")

    # ──────────────────────────────────────────────────────────────
    # 3. CUADRO 2 — Precios corrientes, constantes e implícitos
    # ──────────────────────────────────────────────────────────────
    df2 = read_sheet(
        "Cuadro 2.",
        [0, 1, 5, 7],
        ["fecha", "indice_precios_corrientes", "indice_precios_constantes", "indice_precios_implicitos"]
    )
    for col in ["indice_precios_corrientes", "indice_precios_constantes", "indice_precios_implicitos"]:
        df2[col] = pd.to_numeric(df2[col], errors="coerce")
    df2 = df2.dropna(subset=["indice_precios_corrientes"]).reset_index(drop=True)
    df2["fecha"] = pd.date_range(start=FECHA_INICIO, periods=len(df2), freq="MS").strftime("%Y-%m-%d")

    # ──────────────────────────────────────────────────────────────
    # 4. CUADRO 3 — Ventas en millones (corrientes + constantes)
    # ──────────────────────────────────────────────────────────────
    df3 = read_sheet(
        "Cuadro 3.",
        [0, 1, 2],
        ["fecha", "ventas_millones_corrientes", "ventas_millones_constantes"]
    )
    for col in ["ventas_millones_corrientes", "ventas_millones_constantes"]:
        df3[col] = pd.to_numeric(df3[col], errors="coerce")
    df3 = df3.dropna(subset=["ventas_millones_corrientes"]).reset_index(drop=True)
    n3 = min(len(df3), len(deflactor))
    df3 = df3.iloc[:n3].copy()
    df3["ventas_millones_corrientes_real"] = df3["ventas_millones_corrientes"].values / deflactor.iloc[:n3].values
    df3["fecha"] = pd.date_range(start=FECHA_INICIO, periods=n3, freq="MS").strftime("%Y-%m-%d")

    # ──────────────────────────────────────────────────────────────
    # 5. CUADRO 4 — Canales de venta y medios de pago
    #    Col 2=salon, 3=online, 4=efectivo, 5=debito, 6=tarjeta, 7=otros
    # ──────────────────────────────────────────────────────────────
    nombres4 = ["salon_corr", "online_corr", "efectivo_corr", "debito_corr", "tarjeta_corr", "otros_corr"]
    df4 = read_sheet(
        "Cuadro 4.",
        [0, 2, 3, 4, 5, 6, 7],
        ["fecha"] + nombres4
    )
    for col in nombres4:
        df4[col] = pd.to_numeric(df4[col], errors="coerce")
    df4 = df4.dropna(subset=["efectivo_corr"]).reset_index(drop=True)
    n4 = min(len(df4), len(deflactor))
    df4 = df4.iloc[:n4].copy()
    for col in nombres4:
        df4[f"{col}_real"] = df4[col].values / deflactor.iloc[:n4].values
    df4["fecha"] = pd.date_range(start=FECHA_INICIO, periods=n4, freq="MS").strftime("%Y-%m-%d")

    # ──────────────────────────────────────────────────────────────
    # 6. CUADRO 5 — Ventas por grupo de artículos y jurisdicción
    #    4 jurisdicciones × 11 grupos (cols 1-11, 13-23, 25-35, 37-47)
    # ──────────────────────────────────────────────────────────────
    GRUPOS = ["total", "bebidas", "almacen", "panaderia", "lacteos", "carnes",
              "verduras", "limpieza", "indumentaria", "electronicos", "otros"]
    JURIS  = ["nac", "caba", "gba", "resto"]
    OFFSETS = [1, 13, 25, 37]  # columna inicial de cada jurisdicción

    cols5   = []
    names5  = []
    for jur, off in zip(JURIS, OFFSETS):
        for i, grp in enumerate(GRUPOS):
            cols5.append(off + i)
            names5.append(f"{jur}_{grp}")

    df5 = read_sheet("Cuadro 5.", [0] + cols5, ["fecha"] + names5)
    for col in names5:
        df5[col] = pd.to_numeric(df5[col], errors="coerce")
    df5 = df5.dropna(subset=["nac_total"]).reset_index(drop=True)
    n5 = min(len(df5), len(deflactor))
    df5 = df5.iloc[:n5].copy()
    for col in names5:
        df5[f"{col}_real"] = df5[col].values / deflactor.iloc[:n5].values
    df5["fecha"] = pd.date_range(start=FECHA_INICIO, periods=n5, freq="MS").strftime("%Y-%m-%d")

    # ──────────────────────────────────────────────────────────────
    # 7. CUADRO 6 — Bocas de expendio y operaciones por jurisdicción
    #    nac: 1-7 | caba: 9-15 | gba: 17-23 | resto: 25-31
    # ──────────────────────────────────────────────────────────────
    METRICAS6 = ["ventas", "bocas", "ventas_por_boca", "superficie", "ventas_m2", "operaciones", "ventas_por_op"]
    OFFSETS6  = [1, 9, 17, 25]

    cols6  = []
    names6 = []
    for jur, off in zip(JURIS, OFFSETS6):
        for i, met in enumerate(METRICAS6):
            cols6.append(off + i)
            names6.append(f"{jur}_{met}")

    df6 = read_sheet("Cuadro 6.", [0] + cols6, ["fecha"] + names6)
    for col in names6:
        df6[col] = pd.to_numeric(df6[col], errors="coerce")
    df6 = df6.dropna(subset=["nac_ventas"]).reset_index(drop=True)
    n6 = min(len(df6), len(deflactor))
    df6 = df6.iloc[:n6].copy()
    # Solo deflactar los "ventas" (no bocas, superficie, operaciones)
    for jur in JURIS:
        for met in ["ventas", "ventas_por_boca", "ventas_m2", "ventas_por_op"]:
            col = f"{jur}_{met}"
            df6[f"{col}_real"] = df6[col].values / deflactor.iloc[:n6].values
    df6["fecha"] = pd.date_range(start=FECHA_INICIO, periods=n6, freq="MS").strftime("%Y-%m-%d")

    # ──────────────────────────────────────────────────────────────
    # 8. CUADRO 7 — Facturación por tipo de comprobante
    # ──────────────────────────────────────────────────────────────
    nombres7 = ["fact_total", "fact_tipo_a", "fact_tipo_b"]
    df7 = read_sheet("Cuadro 7.", [0, 1, 4, 7], ["fecha"] + nombres7)
    for col in nombres7:
        df7[col] = pd.to_numeric(df7[col], errors="coerce")
    df7 = df7.dropna(subset=["fact_total"]).reset_index(drop=True)
    n7 = min(len(df7), len(deflactor))
    df7 = df7.iloc[:n7].copy()
    for col in nombres7:
        df7[f"{col}_real"] = df7[col].values / deflactor.iloc[:n7].values
    df7["fecha"] = pd.date_range(start=FECHA_INICIO, periods=n7, freq="MS").strftime("%Y-%m-%d")

    # ──────────────────────────────────────────────────────────────
    # 9. CONSOLIDACIÓN Y EXPORTACIÓN
    # ──────────────────────────────────────────────────────────────
    def to_records(df, cols):
        existing = [c for c in cols if c in df.columns]
        records = []
        for _, row in df[existing].iterrows():
            rec = {}
            for c in existing:
                rec[c] = safe_float(row[c]) if c != "fecha" else row[c]
            records.append(rec)
        return records

    nominal_data = {
        "cuadro_1": to_records(df1, ["fecha", "indice_serie_original", "indice_desestacionalizada", "indice_tendencia_ciclo"]),
        "cuadro_2": to_records(df2, ["fecha", "indice_precios_corrientes", "indice_precios_constantes", "indice_precios_implicitos"]),
        "cuadro_3": to_records(df3, ["fecha", "ventas_millones_corrientes", "ventas_millones_constantes"]),
        "cuadro_4": to_records(df4, ["fecha"] + nombres4),
        "cuadro_5": to_records(df5, ["fecha"] + names5),
        "cuadro_6": to_records(df6, ["fecha"] + names6),
        "cuadro_7": to_records(df7, ["fecha"] + nombres7),
    }

    names5_real = [f"{n}_real" for n in names5]
    names6_real_ventas = []
    for jur in JURIS:
        for met in ["ventas", "ventas_por_boca", "ventas_m2", "ventas_por_op"]:
            names6_real_ventas.append(f"{jur}_{met}_real")
    nombres7_real = [f"{n}_real" for n in nombres7]

    real_data = {
        "cuadro_3_real": to_records(df3, ["fecha", "ventas_millones_corrientes_real"]),
        "cuadro_4_real": to_records(df4, ["fecha"] + [f"{n}_real" for n in nombres4]),
        "cuadro_5_real": to_records(df5, ["fecha"] + names5_real),
        "cuadro_6_real": to_records(df6, ["fecha"] + names6_real_ventas + [f"{jur}_bocas" for jur in JURIS] + [f"{jur}_superficie" for jur in JURIS] + [f"{jur}_operaciones" for jur in JURIS]),
        "cuadro_7_real": to_records(df7, ["fecha"] + nombres7_real),
        "meta": {
            "total_periodos": n5,
            "fecha_inicio": FECHA_INICIO,
            "ultima_fecha": df5["fecha"].iloc[-1] if n5 > 0 else None,
        }
    }

    with open("data/mayoristas_final.json", "w", encoding="utf-8") as f:
        json.dump(nominal_data, f, indent=2, ensure_ascii=False)

    with open("data/mayoristas_real.json", "w", encoding="utf-8") as f:
        json.dump(real_data, f, indent=2, ensure_ascii=False)

    print(f"✅ JSONs generados — {n5} períodos procesados.")
    print(f"   Última fecha: {df5['fecha'].iloc[-1]}")


if __name__ == "__main__":
    EXCEL_PATH = "data/raw/super_mayoristas.xlsx"

    try:
        procesar_todo(EXCEL_PATH)
    except Exception as e:
        import traceback
        print(f"❌ Error crítico: {e}")
        traceback.print_exc()
        exit(1)
