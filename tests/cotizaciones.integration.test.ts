import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import { CotizacionModel } from "../src/models/Cotizacion.js";

const API_KEY = process.env.BACKEND_API_KEY ?? "test-backend-api-key-0123456789";

let mongod: MongoMemoryServer;
const app = createApp();

const payloadValido = {
  tipologiaSlug: "aljibe",
  tipologiaNombre: "Aljibe",
  especificaciones: { capacidadLitros: 10000, ejes: 2 },
  contacto: {
    nombre: "Juan Pérez",
    email: "juan@example.com",
    telefono: "+56911111111",
    // empresa y comentario deliberadamente omitidos: deben aceptarse como null (LA-2026-034)
  },
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await CotizacionModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("POST /api/cotizaciones", () => {
  it("rechaza el request sin la API key server-to-server", async () => {
    const res = await request(app).post("/api/cotizaciones").send(payloadValido);
    expect(res.status).toBe(401);
  });

  it("crea una cotización con campos de contacto opcionales omitidos (LA-2026-034)", async () => {
    const res = await request(app)
      .post("/api/cotizaciones")
      .set("x-backend-api-key", API_KEY)
      .send(payloadValido);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.rangoEstimadoCLP.min).toBeGreaterThan(0);
    expect(res.body.rangoEstimadoCLP.max).toBeGreaterThan(res.body.rangoEstimadoCLP.min);
  });

  it("acepta explícitamente `null` en campos opcionales de contacto, no solo la omisión (LA-2026-034)", async () => {
    const res = await request(app)
      .post("/api/cotizaciones")
      .set("x-backend-api-key", API_KEY)
      .send({
        ...payloadValido,
        contacto: { ...payloadValido.contacto, empresa: null, comentario: null },
      });

    expect(res.status).toBe(201);
  });

  it("rechaza un request sin especificaciones con 400 y detalle de Zod", async () => {
    const { especificaciones, ...payloadInvalido } = payloadValido;
    void especificaciones;

    const res = await request(app)
      .post("/api/cotizaciones")
      .set("x-backend-api-key", API_KEY)
      .send(payloadInvalido);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("detalle");
  });

  it("persiste el documento con los campos de snapshot y metadata esperados, sin omitir ninguno (LA-2026-001)", async () => {
    await request(app).post("/api/cotizaciones").set("x-backend-api-key", API_KEY).send(payloadValido);

    const guardada = await CotizacionModel.findOne({ tipologiaSlug: "aljibe" })
      .select("tipologiaSlug tipologiaNombre especificaciones reglaCalculoVersion rangoEstimadoCLP contacto estado canalOrigen notificacionEnviada notificacionIntentos")
      .lean();

    expect(guardada).not.toBeNull();
    expect(guardada?.tipologiaNombre).toBe("Aljibe");
    expect(guardada?.estado).toBe("nueva");
    expect(guardada?.canalOrigen).toBe("formulario_web");
    expect(guardada?.contacto.empresa).toBeNull();
    expect(guardada?.notificacionIntentos).toBeGreaterThan(0);
  });
});
