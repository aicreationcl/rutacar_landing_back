import { Router } from "express";
import { crearCotizacion } from "../controllers/cotizaciones.controller.js";
import { leadsRateLimiter } from "../middleware/rateLimiter.js";

export const cotizacionesRouter = Router();

cotizacionesRouter.post("/", leadsRateLimiter, crearCotizacion);
