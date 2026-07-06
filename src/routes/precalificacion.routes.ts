import { Router } from "express";
import { crearPrecalificacion } from "../controllers/precalificacion.controller.js";
import { leadsRateLimiter } from "../middleware/rateLimiter.js";

export const precalificacionRouter = Router();

precalificacionRouter.post("/", leadsRateLimiter, crearPrecalificacion);
