import { describe, expect, it } from "vitest";
import { REGLA_CALIFICACION_VERSION, calificarLead } from "./precalificacion.service.js";

describe("calificarLead", () => {
  it('plazo "inmediato" → prioritario', () => {
    expect(calificarLead({ plazoEstimado: "inmediato" })).toBe("prioritario");
  });

  it('plazo "1-3-meses" → a_seguir', () => {
    expect(calificarLead({ plazoEstimado: "1-3-meses" })).toBe("a_seguir");
  });

  it.each(["3-6-meses", "mas-de-6-meses", "valor-desconocido"])(
    "plazo %s → descartar",
    (plazo) => {
      expect(calificarLead({ plazoEstimado: plazo })).toBe("descartar");
    },
  );

  it("expone REGLA_CALIFICACION_VERSION como string no vacío (snapshot pattern, LA-2026-002)", () => {
    expect(typeof REGLA_CALIFICACION_VERSION).toBe("string");
    expect(REGLA_CALIFICACION_VERSION.length).toBeGreaterThan(0);
  });
});
