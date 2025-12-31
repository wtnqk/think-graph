import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { edges } from "./edges.js";
import type { EdgeResponse, ErrorResponse, SuccessResponse } from "../types/api.js";

vi.mock("../services/edge.js", async () => {
  const { MockEdgeService, MockEdgeCreationError, MockEdgeNotFoundError } = await import("../services/edge.mock.js");
  return {
    EdgeService: MockEdgeService,
    EdgeCreationError: MockEdgeCreationError,
    EdgeNotFoundError: MockEdgeNotFoundError,
  };
});

vi.mock("../lib/db.js", () => ({
  createDb: vi.fn(),
}));

// Create app with routes
const app = new Hono();
app.route("/edges", edges);

// Helper to create valid JWT token
async function createToken(payload: Record<string, unknown> = {}) {
  return await sign(
    {
      sub: "test-user-123",
      email: "test@example.com",
      name: "Test User",
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...payload,
    },
    env.JWT_SECRET
  );
}

describe("Edges Routes", () => {
  let mockEdgeService: import("../services/edge.mock.js").MockEdgeServiceType;
  let MockEdgeCreationError: typeof import("../services/edge.mock.js").MockEdgeCreationError;
  let MockEdgeNotFoundError: typeof import("../services/edge.mock.js").MockEdgeNotFoundError;

  beforeEach(async () => {
    vi.clearAllMocks();
    // console.errorをモックしてテストログのノイズを抑制
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mocks = await import("../services/edge.mock.js");
    mockEdgeService = mocks.mockEdgeService;
    MockEdgeCreationError = mocks.MockEdgeCreationError;
    MockEdgeNotFoundError = mocks.MockEdgeNotFoundError;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("すべてのエンドポイントで認証が必要", async () => {
      const endpoints = [
        { method: "GET", path: "/edges" },
        { method: "POST", path: "/edges" },
        { method: "DELETE", path: "/edges/123" },
      ];

      for (const endpoint of endpoints) {
        const req = new Request(`http://localhost${endpoint.path}`, {
          method: endpoint.method,
          headers: endpoint.method === "POST"
            ? { "Content-Type": "application/json" }
            : {},
          body: endpoint.method === "POST"
            ? JSON.stringify({})
            : undefined,
        });
        const res = await app.fetch(req, env);

        expect(res.status).toBe(401);
        const body = await res.json() as ErrorResponse;
        expect(body.error).toBe("Unauthorized");
      }
    });
  });

  describe("GET /edges", () => {
    it("正常にエッジ一覧を返す", async () => {
      const token = await createToken();
      const mockEdges = [
        {
          id: "edge-1",
          source_id: "node-1",
          target_id: "node-2",
          created_at: "2023-01-01T00:00:00.000Z",
        },
        {
          id: "edge-2",
          source_id: "node-2",
          target_id: "node-3",
          created_at: "2023-01-01T01:00:00.000Z",
        },
      ];
      mockEdgeService.getEdges.mockResolvedValue(mockEdges);

      const req = new Request("http://localhost/edges", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("application/json");

      const body = await res.json() as EdgeResponse[];
      expect(Array.isArray(body)).toBe(true);
      expect(body).toEqual(mockEdges);
      expect(mockEdgeService.getEdges).toHaveBeenCalledWith({});
    });

    it("source_idクエリパラメータでフィルタリング", async () => {
      const token = await createToken();
      mockEdgeService.getEdges.mockResolvedValue([]);

      const req = new Request("http://localhost/edges?source_id=node-1", {
        headers: { Authorization: `Bearer ${token}` },
      });
      await app.fetch(req, env);

      expect(mockEdgeService.getEdges).toHaveBeenCalledWith({
        sourceId: "node-1",
      });
    });

    it("target_idクエリパラメータでフィルタリング", async () => {
      const token = await createToken();
      mockEdgeService.getEdges.mockResolvedValue([]);

      const req = new Request("http://localhost/edges?target_id=node-2", {
        headers: { Authorization: `Bearer ${token}` },
      });
      await app.fetch(req, env);

      expect(mockEdgeService.getEdges).toHaveBeenCalledWith({
        targetId: "node-2",
      });
    });

    it("両方のクエリパラメータでフィルタリング", async () => {
      const token = await createToken();
      mockEdgeService.getEdges.mockResolvedValue([]);

      const req = new Request("http://localhost/edges?source_id=node-1&target_id=node-2", {
        headers: { Authorization: `Bearer ${token}` },
      });
      await app.fetch(req, env);

      expect(mockEdgeService.getEdges).toHaveBeenCalledWith({
        sourceId: "node-1",
        targetId: "node-2",
      });
    });

    it("サービスエラーの場合は500を返す", async () => {
      const token = await createToken();
      mockEdgeService.getEdges.mockRejectedValue(new Error("Database error"));

      const req = new Request("http://localhost/edges", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(500);
      const body = await res.json() as ErrorResponse;
      expect(body.error).toBe("Internal server error");
    });
  });

  describe("POST /edges", () => {
    it("正常にエッジを作成する", async () => {
      const token = await createToken();
      const mockEdge = {
        id: "edge-123",
        source_id: "node-1",
        target_id: "node-2",
        created_at: "2023-01-01T00:00:00.000Z",
      };
      mockEdgeService.createEdge.mockResolvedValue(mockEdge);

      const edgeData = {
        source_id: "node-1",
        target_id: "node-2",
      };

      const req = new Request("http://localhost/edges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(edgeData),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(201);
      const body = await res.json() as EdgeResponse;
      expect(body).toEqual(mockEdge);

      expect(mockEdgeService.createEdge).toHaveBeenCalledWith(edgeData);
    });

    it("ArkTypeバリデーションエラーで400を返す", async () => {
      const token = await createToken();

      const invalidData = {
        source_id: 123, // should be string
        target_id: "node-2",
      };

      const req = new Request("http://localhost/edges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidData),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      const body = await res.json() as ErrorResponse;
      expect(typeof body.error).toBe("string");
      expect(mockEdgeService.createEdge).not.toHaveBeenCalled();
    });

    it("必須フィールドなしで400を返す", async () => {
      const token = await createToken();

      const incompleteData = {
        source_id: "node-1",
        // target_id missing
      };

      const req = new Request("http://localhost/edges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(incompleteData),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      expect(mockEdgeService.createEdge).not.toHaveBeenCalled();
    });

    it("EdgeCreationErrorで404を返す", async () => {
      const token = await createToken();
      mockEdgeService.createEdge.mockRejectedValue(
        new MockEdgeCreationError("Source node not found")
      );

      const edgeData = {
        source_id: "nonexistent-node",
        target_id: "node-2",
      };

      const req = new Request("http://localhost/edges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(edgeData),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(404);
      const body = await res.json() as ErrorResponse;
      expect(body.error).toBe("Source or target node not found");
    });

    it("予期しないエラーで500を返す", async () => {
      const token = await createToken();
      mockEdgeService.createEdge.mockRejectedValue(new Error("Database error"));

      const edgeData = {
        source_id: "node-1",
        target_id: "node-2",
      };

      const req = new Request("http://localhost/edges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(edgeData),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(500);
      const body = await res.json() as ErrorResponse;
      expect(body.error).toBe("Internal server error");
    });
  });

  describe("DELETE /edges/:id", () => {
    it("正常にエッジを削除する", async () => {
      const token = await createToken();
      mockEdgeService.deleteEdge.mockResolvedValue(undefined);

      const req = new Request("http://localhost/edges/edge-123", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const body = await res.json() as SuccessResponse;
      expect(body.ok).toBe(true);

      expect(mockEdgeService.deleteEdge).toHaveBeenCalledWith("edge-123");
    });

    it("EdgeNotFoundErrorで404を返す", async () => {
      const token = await createToken();
      mockEdgeService.deleteEdge.mockRejectedValue(
        new MockEdgeNotFoundError("nonexistent")
      );

      const req = new Request("http://localhost/edges/nonexistent", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(404);
      const body = await res.json() as ErrorResponse;
      expect(body.error).toBe("Edge not found");
    });

    it("予期しないエラーで500を返す", async () => {
      const token = await createToken();
      mockEdgeService.deleteEdge.mockRejectedValue(new Error("Database error"));

      const req = new Request("http://localhost/edges/edge-123", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(500);
      const body = await res.json() as ErrorResponse;
      expect(body.error).toBe("Internal server error");
    });
  });
});