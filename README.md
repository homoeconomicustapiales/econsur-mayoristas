# EconSur · Monitor de Autoservicios Mayoristas

Dashboard interactivo de la **Encuesta de Autoservicios Mayoristas** del INDEC Argentina.

## Stack

| Capa | Tecnología |
|---|---|
| ETL | Python (pandas + openpyxl) |
| Frontend | Next.js 14 + TypeScript + Recharts + Tailwind CSS |
| CI/CD | GitHub Actions |
| Deploy | Vercel |

## Estructura del proyecto

```
econsur-mayoristas/
├── data/
│   ├── raw/
│   │   └── super_mayoristas.xlsx   ← subir manualmente cada mes
│   ├── mayoristas_final.json       ← generado por processor.py
│   └── mayoristas_real.json        ← generado por processor.py
├── scripts/
│   └── processor.py                ← ETL principal
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── charts/
│   │   │   ├── MainSeriesChart.tsx
│   │   │   ├── PaymentMethodsChart.tsx
│   │   │   ├── SalesChannelsChart.tsx
│   │   │   ├── SectorEvolutionChart.tsx
│   │   │   ├── RegionalSalesChart.tsx
│   │   │   ├── BocasOperacionesChart.tsx  ← nuevo (Cuadro 6)
│   │   │   └── FacturacionChart.tsx       ← nuevo (Cuadro 7)
│   │   ├── kpi/
│   │   │   └── KpiCard.tsx
│   │   └── shared/
│   │       ├── DatePicker.tsx
│   │       └── Sidebar.tsx
│   ├── store/
│   │   └── store.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── calculations.ts
├── .github/
│   └── workflows/
│       └── process-data.yml
├── requirements.txt
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

## Cuadros INDEC utilizados

| Cuadro | Contenido | Gráficos |
|---|---|---|
| Cuadro 1 | Índices de ventas (constantes): original, desestacionalizada, tendencia-ciclo | Series Principales |
| Cuadro 2 | Precios corrientes, constantes e IPI (deflactor) | — |
| Cuadro 3 | Ventas en millones (corrientes y constantes) | KPIs |
| Cuadro 4 | Canales (salón/online) y medios de pago | Medios de Pago · Canales |
| Cuadro 5 | Grupos de artículos × 4 jurisdicciones | Grupos · Jurisdicciones |
| Cuadro 6 | Bocas de expendio, superficie, operaciones | Bocas y Operaciones |
| Cuadro 7 | Facturación tipo A (empresas) y B (consumidor) | Facturación |

## Flujo de actualización mensual

```
1. INDEC publica nuevo Excel en su sitio web
2. Descargar super_mayoristas.xlsx
3. Subir a data/raw/ en GitHub (reemplazar el existente)
4. GitHub Actions ejecuta processor.py automáticamente (~30 seg)
5. Se hace commit de mayoristas_final.json + mayoristas_real.json
6. Vercel detecta el cambio y hace deploy automático (~1-2 min)
```

## Setup inicial (primera vez)

### 1. Clonar e instalar

```bash
git clone https://github.com/TU_USER/econsur-mayoristas
cd econsur-mayoristas
npm install
```

### 2. Generar JSONs localmente

```bash
pip install -r requirements.txt
# Colocar el Excel en data/raw/super_mayoristas.xlsx
python scripts/processor.py
```

### 3. Desarrollo local

```bash
npm run dev
# → http://localhost:3000
```

### 4. Deploy en Vercel

```bash
# Conectar repo en vercel.com/new
# Framework: Next.js
# Root Directory: ./
# Sin variables de entorno requeridas
```

## Deflactación

Todos los valores nominales se deflactan usando el **Índice de Precios Implícitos (IPI)** 
publicado en el Cuadro 2 (columna 7 del Excel):

```
valor_real = valor_corriente / (IPI / 100)
```

Esto permite comparar volúmenes de ventas eliminando el efecto inflacionario.
