import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, { error: "MONGODB_URI es obligatorio" }),
  BACKEND_API_KEY: z
    .string()
    .min(16, { error: "BACKEND_API_KEY debe tener al menos 16 caracteres" }),
  ALLOWED_ORIGINS: z
    .string()
    .default("")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(5),
  // dotenv carga las variables vacías del .env como "" (no como undefined) —
  // se normalizan a undefined antes de validar el formato de email.
  NOTIFICATION_EMAIL_TO: z.preprocess((v) => (v === "" ? undefined : v), z.email().optional()),
  NOTIFICATION_EMAIL_FROM: z.preprocess((v) => (v === "" ? undefined : v), z.email().optional()),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variables de entorno inválidas:", z.treeifyError(parsed.error));
  throw new Error("Configuración de entorno inválida — revisa .env contra .env.example");
}

export const env = parsed.data;
