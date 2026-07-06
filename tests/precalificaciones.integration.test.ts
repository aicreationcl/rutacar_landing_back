import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PrecalificacionLeadModel } from "../src/models/PrecalificacionLead.js";

const API_KEY = process.env.BACKEND_API_KEY ?? "test-backend-api-key-0123456789";

let mongod: MongoMemoryServer;
const app = createApp();

const payloadValido = {
  tipoVehiculo: "gas",
  industria: "Distribución de gas",
  plazoEstimado: "inmediato",
  contacto: {
    nombre: "Juan Pérez",
    email: "juan@example.com",
    telefono: "+56911111111",
    // usoPrincipal deliberadamente omitido: debe aceptarse (LA-2026-034)
  },
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await PrecalificacionLeadModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("POST /api/precalificaciones", () => {
  it("rechaza el request sin la API key server-to-server", async () => {
    const res = await request(app).post("/api/precalificaciones").send(payloadValido);
    expect(res.status).toBe(401);
  });

  it("crea un lead con usoPrincipal omitido y lo califica como prioritario", async () => {
    const res = await request(app)
      .post("/api/precalificaciones")
      .set("x-backend-api-key", API_KEY)
      .send(payloadValido);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.calificacion).toBe("prioritario");
  });

  it("acepta explícitamente `null` en usoPrincipal, no solo la omisión (LA-2026-034)", async () => {
    const res = await request(app)
      .post("/api/precalificaciones")
      .set("x-backend-api-key", API_KEY)
      .send({ ...payloadValido, usoPrincipal: null });

    expect(res.status).toBe(201);
  });

  it("califica como a_seguir con plazo 1-3-meses", async () => {
    const res = await request(app)
      .post("/api/precalificaciones")
      .set("x-backend-api-key", API_KEY)
      .send({ ...payloadValido, plazoEstimado: "1-3-meses" });

    expect(res.status).toBe(201);
    expect(res.body.calificacion).toBe("a_seguir");
  });

  it("rechaza un plazoEstimado fuera del enum con 400", async () => {
    const res = await request(app)
      .post("/api/precalificaciones")
      .set("x-backend-api-key", API_KEY)
      .send({ ...payloadValido, plazoEstimado: "algun-dia" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("detalle");
  });

  it("persiste el documento con los campos esperados, sin omitir ninguno (LA-2026-001)", async () => {
    await request(app).post("/api/precalificaciones").set("x-backend-api-key", API_KEY).send(payloadValido);

    const guardado = await PrecalificacionLeadModel.findOne({ tipoVehiculo: "gas" })
      .select("tipoVehiculo industria calificacion reglaCalificacionVersion estado canalOrigen notificacionEnviada notificacionIntentos")
      .lean();

    expect(guardado).not.toBeNull();
    expect(guardado?.estado).toBe("nueva");
    expect(guardado?.canalOrigen).toBe("formulario_precalificacion");
    expect(guardado?.notificacionIntentos).toBeGreaterThan(0);
  });
});
