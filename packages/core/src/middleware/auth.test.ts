import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { authMiddleware } from "./auth.js";
import type { JwtPayload } from "../domain/user.js";

type Env = {
  Bindings: {
    JWT_SECRET: string;
  };
  Variables: {
    user: JwtPayload;
  };
};

const app = new Hono<Env>();

// Test environment with JWT_SECRET
const testEnv = {
  JWT_SECRET: "test-secret-key",
};

// Mock protected route
app.use("/protected", authMiddleware);
app.get("/protected", (c) => {
  const user = c.get("user");
  return c.json({ message: "Protected content", user });
});

describe("Authentication Middleware", () => {
  it("Authorizationヘッダーなしのリクエストを拒否する", async () => {
    const req = new Request("http://localhost/protected");
    const res = await app.fetch(req, testEnv);

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("無効なAuthorization形式のリクエストを拒否する", async () => {
    const req = new Request("http://localhost/protected", {
      headers: {
        Authorization: "InvalidFormat token123",
      },
    });
    const res = await app.fetch(req, testEnv);

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("無効なトークンのリクエストを拒否する", async () => {
    const req = new Request("http://localhost/protected", {
      headers: {
        Authorization: "Bearer invalid-token",
      },
    });
    const res = await app.fetch(req, testEnv);

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "Invalid token" });
  });

  it("有効なトークンのリクエストを許可する", async () => {
    // Create a valid token
    const payload = {
      sub: "user123",
      email: "test@example.com",
      name: "Test User",
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    const token = await sign(payload, testEnv.JWT_SECRET);

    const req = new Request("http://localhost/protected", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const res = await app.fetch(req, testEnv);

    expect(res.status).toBe(200);
    const body = await res.json() as { message: string; user: JwtPayload };
    expect(body.message).toBe("Protected content");
    expect(body.user.sub).toBe("user123");
    expect(body.user.email).toBe("test@example.com");
    expect(body.user.name).toBe("Test User");
  });

  it("期限切れトークンを拒否する", async () => {
    // Create an expired token
    const payload = {
      sub: "user123",
      email: "test@example.com",
      name: "Test User",
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    };

    const token = await sign(payload, testEnv.JWT_SECRET);

    const req = new Request("http://localhost/protected", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const res = await app.fetch(req, testEnv);

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "Invalid token" });
  });

  it("異なる秘密鍵で署名されたトークンを拒否する", async () => {
    const payload = {
      sub: "user123",
      email: "test@example.com",
      name: "Test User",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    // Sign with different secret
    const token = await sign(payload, "wrong-secret");

    const req = new Request("http://localhost/protected", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const res = await app.fetch(req, testEnv);

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "Invalid token" });
  });
});