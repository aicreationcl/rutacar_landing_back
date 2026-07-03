import { Router } from "express";
import { crearCotizacion } from "../controllers/cotizaciones.controller.js";
import { cotizacionesRateLimiter } from "../middleware/rateLimiter.js";

export const cotizacionesRouter = Router();

cotizacionesRouter.post("/", cotizacionesRateLimiter, crearCotizacion);
