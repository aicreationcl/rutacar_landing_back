import { z } from "zod";

/**
 * `plazoEstimado` debe coincidir con los `value` de PLAZO_OPCIONES en
 * rutacar_corp/lib/cotizador/especificacionesConfig.ts — sincronizado a mano
 * entre repos, mismo patrón de deuda técnica que DT-07 (contrato de tipos).
 */
const PLAZO_VALORES = ["inmediato", "1-3-meses", "3-6-meses", "mas-de-6-meses"] as const;

export const crearPrecalificacionSchema = z.object({
  tipoVehiculo: z.string().min(1, { error: "tipoVehiculo es obligatorio" }),
  industria: z.string().min(1, { error: "industria es obligatorio" }),
  usoPrincipal: z.string().nullable().optional(),
  plazoEstimado: z.enum(PLAZO_VALORES, { error: "plazoEstimado inválido" }),
  contacto: z.object({
    nombre: z.string().min(2, { error: "El nombre es obligatorio" }),
    email: z.email({ error: "Email inválido" }),
    telefono: z.string().min(6, { error: "El teléfono es obligatorio" }),
  }),
});

export type CrearPrecalificacionInput = z.infer<typeof crearPrecalificacionSchema>;
