import { describe, expect, it } from "vitest";
import { REGLA_CALCULO_VERSION, calcularRangoEstimado } from "./pricing.service.js";

const SLUGS_CONOCIDOS = [
  "carga-general",
  "plana-con-baranda",
  "plana",
  "gas",
  "cortinera",
  "especiales",
  "estandar-ganadero",
  "minera",
];

describe("calcularRangoEstimado", () => {
  it.each(SLUGS_CONOCIDOS)("devuelve rango fijo para slug conocido: %s", (slug) => {
    const rango = calcularRangoEstimado(slug);
    expect(rango.min).toBeGreaterThan(0);
    expect(rango.max).toBeGreaterThan(rango.min);
  });

  it("cae al rango default para slug desconocido", () => {
    const rango = calcularRangoEstimado("slug-inexistente");
    expect(rango).toEqual({ min: 5_000_000, max: 10_000_000 });
  });

  it("es determinista: mismo slug, mismo rango", () => {
    expect(calcularRangoEstimado("minera")).toEqual(calcularRangoEstimado("minera"));
  });

  it("mantiene min < max en todas las tipologías + default (invariante)", () => {
    for (const slug of [...SLUGS_CONOCIDOS, "slug-inexistente"]) {
      const rango = calcularRangoEstimado(slug);
      expect(rango.min).toBeLessThan(rango.max);
    }
  });

  it("expone REGLA_CALCULO_VERSION como string no vacío (snapshot pattern, LA-2026-002)", () => {
    expect(typeof REGLA_CALCULO_VERSION).toBe("string");
    expect(REGLA_CALCULO_VERSION.length).toBeGreaterThan(0);
  });
});
