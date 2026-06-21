import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Test UNITARIO del handler de registro. Se aísla de la BD real:
 * - @/db se mockea para simular "el email/usuario ya existe" o no.
 * - bcryptjs se mockea para no gastar tiempo en el hashing real.
 * Lo que se prueba es la LÓGICA del handler (validaciones y códigos de estado).
 */

// vi.mock se hoistea al inicio del archivo, así que las funciones del mock deben
// crearse con vi.hoisted() para existir antes de que se ejecute la factory.
const { findFirst, values, insert } = vi.hoisted(() => {
  const findFirst = vi.fn();
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn(() => ({ values }));
  return { findFirst, values, insert };
});

vi.mock("@/db", () => ({
  db: {
    query: { users: { findFirst } },
    insert,
  },
}));

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
}));

import { POST } from "./route";

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  username: "nuevo",
  email: "nuevo@grank.com",
  password: "secret123",
  sex: "MALE",
  weightKg: 80,
};

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    values.mockResolvedValue(undefined);
  });

  it("rechaza con 400 si el email ya está registrado", async () => {
    findFirst.mockResolvedValueOnce({ id: 1, email: validBody.email }); // email existe

    const res = await POST(buildRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("El email ya está registrado");
    expect(insert).not.toHaveBeenCalled();
  });

  it("rechaza con 400 si el username ya existe", async () => {
    findFirst
      .mockResolvedValueOnce(null) // email libre
      .mockResolvedValueOnce({ id: 2, username: validBody.username }); // username existe

    const res = await POST(buildRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("El usuario ya existe");
    expect(insert).not.toHaveBeenCalled();
  });

  it("crea el usuario y responde 201 cuando los datos son nuevos", async () => {
    findFirst.mockResolvedValue(null); // ni email ni username existen

    const res = await POST(buildRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual({ success: true });
    expect(insert).toHaveBeenCalledTimes(1);
    // Se inserta con el hash (no la contraseña en claro) y el peso como string.
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "nuevo",
        email: "nuevo@grank.com",
        passwordHash: "hashed-password",
        weightKg: "80",
      }),
    );
  });

  it("responde 500 si el body no es JSON válido", async () => {
    const badReq = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "esto no es json",
    });

    const res = await POST(badReq);
    expect(res.status).toBe(500);
  });
});
