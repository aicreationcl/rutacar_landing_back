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

const RANGO_BASE_CLP: Record<string, { min: number; max: number }> = {
  aljibe: { min: 8_000_000, max: 14_000_000 },
  batea: { min: 6_000_000, max: 10_000_000 },
  cabina: { min: 5_000_000, max: 9_000_000 },
  carroceria_gas: { min: 9_000_000, max: 16_000_000 },
  carroceria_mineria: { min: 12_000_000, max: 22_000_000 },
  furgon: { min: 6_500_000, max: 11_000_000 },
  jaula_ganadera: { min: 7_000_000, max: 12_500_000 },
  plataforma: { min: 5_500_000, max: 9_500_000 },
};

const RANGO_DEFAULT_CLP = { min: 5_000_000, max: 10_000_000 };

export interface RangoEstimado {
  min: number;
  max: number;
}

export function calcularRangoEstimado(tipologiaSlug: string): RangoEstimado {
  return RANGO_BASE_CLP[tipologiaSlug] ?? RANGO_DEFAULT_CLP;
}
