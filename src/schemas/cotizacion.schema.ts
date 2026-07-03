import { z } from "zod";

/**
 * LA-2026-034: los campos que el formulario puede enviar explícitamente como
 * `null` (no solo omitirlos) deben declararse `.nullable().optional()`, no solo
 * `.optional()` — de lo contrario Zod rechaza el request con 400 antes de que
 * llegue al controlador.
 */
// `tipologiaNombre` viaja en el request porque el catálogo de tipologías (single
// source of truth, LA-2026-027) vive en el repo del sitio Next.js
// (`lib/content/tipologias.ts`), no en este backend — el proxy resuelve el
// nombre a partir del slug y lo envía ya resuelto, quedando grabado como
// snapshot (LA-2026-002) en el documento de la cotización.
export const crearCotizacionSchema = z.object({
  tipologiaSlug: z.string().min(1, { error: "tipologiaSlug es obligatorio" }),
  tipologiaNombre: z.string().min(1, { error: "tipologiaNombre es obligatorio" }),
  especificaciones: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  contacto: z.object({
    nombre: z.string().min(2, { error: "El nombre es obligatorio" }),
    email: z.email({ error: "Email inválido" }),
    telefono: z.string().min(6, { error: "El teléfono es obligatorio" }),
    empresa: z.string().nullable().optional(),
    comentario: z.string().nullable().optional(),
  }),
});

export type CrearCotizacionInput = z.infer<typeof crearCotizacionSchema>;
