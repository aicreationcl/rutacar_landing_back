/**
 * Reglas de cálculo de la cotización preliminar.
 *
 * PENDIENTE (R-001, LA-2026-014 análoga): las reglas reales dependen de una
 * reunión con el equipo comercial de Ruta Car que todavía no se agenda. Mientras
 * tanto se usa un rango conservador y genérico por tipología (LA-2026-045: ante
 * ausencia de un insumo de negocio, usar un placeholder honesto y explícito, no
 * inventar una regla como si fuera definitiva).
 *
 * `version` queda grabado en cada cotización (snapshot, LA-2026-002) para poder
 * distinguir después qué cotizaciones se calcularon con este rango provisional
 * y cuáles con la regla real que confirme Ruta Car.
 */
export const REGLA_CALCULO_VERSION = "v0-conservador-provisional";

/**
 * Las claves DEBEN coincidir con los `slug` reales de
 * `rutacar_landing_new/lib/content/tipologias.ts` (single source de verdad del
 * catálogo, LA-2026-027) — este backend no importa ese archivo porque vive en
 * un repositorio separado, así que la lista se mantiene sincronizada a mano.
 * Verificado durante la prueba end-to-end del proxy: una primera versión de
 * este mapa usaba slugs inventados que no coincidían con ninguno real, y toda
 * cotización caía silenciosamente al rango por defecto sin que ningún test lo
 * detectara (los tests del backend no conocen el catálogo real del frontend).
 */
const RANGO_BASE_CLP: Record<string, { min: number; max: number }> = {
  "carga-general": { min: 5_500_000, max: 9_500_000 },
  "plana-con-baranda": { min: 5_500_000, max: 9_500_000 },
  plana: { min: 5_000_000, max: 9_000_000 },
  gas: { min: 9_000_000, max: 16_000_000 },
  cortinera: { min: 6_500_000, max: 11_000_000 },
  especiales: { min: 8_000_000, max: 14_000_000 },
  "estandar-ganadero": { min: 7_000_000, max: 12_500_000 },
  minera: { min: 12_000_000, max: 22_000_000 },
};

const RANGO_DEFAULT_CLP = { min: 5_000_000, max: 10_000_000 };

export interface RangoEstimado {
  min: number;
  max: number;
}

export function calcularRangoEstimado(tipologiaSlug: string): RangoEstimado {
  return RANGO_BASE_CLP[tipologiaSlug] ?? RANGO_DEFAULT_CLP;
}
