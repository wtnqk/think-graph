import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { nodes } from "./nodes.js";
import { Node } from "../domain/node.js";
import { User } from "../domain/user.js";
import { ID } from "../domain/ids.js";
import type { NodeResponse, ErrorResponse, SuccessResponse } from "../types/api.js";

vi.mock("../services/node.js", async () => {
  const { MockNodeService } = await import("../services/node.mock.js");
  return {
    NodeService: MockNodeService,
  };
});

vi.mock("../lib/db.js", () => ({
  createDb: vi.fn(),
}));

// Create app with routes
const app = new Hono();
app.route("/nodes", nodes);

// Helper to create valid JWT token
async function createToken(payload: Record<string, unknown> = {}) {
  return await sign(
    {
      sub: "550e8400-e29b-41d4-a716-446655440000",
      email: "test@example.com",
      name: "Test User",
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...payload,
    },
    env.JWT_SECRET
  );
}

// Mock node for testing
const mockNode = Node.create(
  { type: "idea", title: "Test Node", content: "Test content" },
  ID.UserId("550e8400-e29b-41d4-a716-446655440000")
);

describe("Nodes Routes", () => {
  let mockNodeService: import("../services/node.mock.js").MockNodeServiceType;

  beforeEach(async () => {
    vi.clearAllMocks();
    // console.errorをモックしてテストログのノイズを抑制
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { mockNodeService: mockService } = await import("../services/node.mock.js");
    mockNodeService = mockService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("すべてのエンドポイントで認証が必要", async () => {
      const endpoints = [
        { method: "GET", path: "/nodes" },
        { method: "GET", path: "/nodes/123" },
        { method: "POST", path: "/nodes" },
        { method: "PATCH", path: "/nodes/123" },
        { method: "DELETE", path: "/nodes/123" },
        { method: "POST", path: "/nodes/123/like" },
        { method: "DELETE", path: "/nodes/123/like" },
        { method: "GET", path: "/nodes/123/likes" },
      ];

      for (const endpoint of endpoints) {
        const req = new Request(`http://localhost${endpoint.path}`, {
          method: endpoint.method,
          headers: endpoint.method === "POST" || endpoint.method === "PATCH"
            ? { "Content-Type": "application/json" }
            : {},
          body: endpoint.method === "POST" || endpoint.method === "PATCH"
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

  describe("GET /nodes", () => {
    it("正常にノード一覧を返す", async () => {
      const token = await createToken();
      mockNodeService.getNodes.mockResolvedValue([mockNode]);

      const res = await app.request("/nodes", {
        headers: { Authorization: `Bearer ${token}` },
      }, env);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("application/json");

      const body = await res.json() as NodeResponse[];
      expect(Array.isArray(body)).toBe(true);
      expect(body[0]).toMatchObject({
        id: expect.any(String),
        type: "idea",
        title: "Test Node",
        content: "Test content",
      });
    });

    it("parent_idクエリパラメータを正しく渡す", async () => {
      const token = await createToken();
      mockNodeService.getNodes.mockResolvedValue([]);

      const req = new Request("http://localhost/nodes?parent_id=parent-123", {
        headers: { Authorization: `Bearer ${token}` },
      });
      await app.fetch(req, env);

      expect(mockNodeService.getNodes).toHaveBeenCalledWith("parent-123");
    });

    it("サービスエラーの場合は500を返す", async () => {
      const token = await createToken();
      mockNodeService.getNodes.mockRejectedValue(new Error("Database error"));

      const req = new Request("http://localhost/nodes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(500);
      const body = await res.json() as ErrorResponse;
      expect(body.error).toBe("Internal server error");
    });
  });

  describe("GET /nodes/:id", () => {
    it("正常にノードを返す", async () => {
      const token = await createToken();
      mockNodeService.getNodeById.mockResolvedValue(mockNode);

      const req = new Request("http://localhost/nodes/node-123", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const body = await res.json() as NodeResponse;
      expect(body.id).toBe(mockNode.id);
      expect(mockNodeService.getNodeById).toHaveBeenCalledWith("node-123");
    });

    it("ノードが見つからない場合は404を返す", async () => {
      const token = await createToken();
      mockNodeService.getNodeById.mockResolvedValue(null);

      const req = new Request("http://localhost/nodes/nonexistent", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(404);
      const body = await res.json() as ErrorResponse;
      expect(body.error).toBe("Node not found");
    });
  });

  describe("POST /nodes", () => {
    it("正常にノードを作成する", async () => {
      const token = await createToken();
      mockNodeService.createNode.mockResolvedValue(mockNode);

      const nodeData = {
        type: "idea",
        title: "New Node",
        content: "New content",
      };

      const req = new Request("http://localhost/nodes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nodeData),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(201);
      const body = await res.json() as NodeResponse;
      expect(body.title).toBe("Test Node");

      expect(mockNodeService.createNode).toHaveBeenCalledWith(
        expect.objectContaining(nodeData),
        expect.any(User)
      );
    });

    it("ArkTypeバリデーションエラーで400を返す", async () => {
      const token = await createToken();

      const invalidData = {
        type: "invalid-type",
        title: "Test",
      };

      const req = new Request("http://localhost/nodes", {
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
      expect(body.error).toContain("type");
      expect(mockNodeService.createNode).not.toHaveBeenCalled();
    });

    it("必須フィールドなしで400を返す", async () => {
      const token = await createToken();

      const incompleteData = {
        type: "idea",
        // title missing
      };

      const req = new Request("http://localhost/nodes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(incompleteData),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      expect(mockNodeService.createNode).not.toHaveBeenCalled();
    });

    it("parent_idを正しく処理する", async () => {
      const token = await createToken();
      mockNodeService.createNode.mockResolvedValue(mockNode);

      const nodeData = {
        type: "comment",
        title: "Child Node",
        parent_id: "parent-123",
      };

      const req = new Request("http://localhost/nodes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nodeData),
      });
      await app.fetch(req, env);

      expect(mockNodeService.createNode).toHaveBeenCalledWith(
        expect.objectContaining({
          parent_id: "parent-123",
        }),
        expect.any(User)
      );
    });
  });

  describe("PATCH /nodes/:id", () => {
    it("正常にノードを更新する", async () => {
      const token = await createToken();
      mockNodeService.updateNode.mockResolvedValue(mockNode);

      const updateData = {
        title: "Updated Title",
        content: "Updated content",
      };

      const req = new Request("http://localhost/nodes/node-123", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const body = await res.json() as NodeResponse;
      expect(body.id).toBe(mockNode.id);

      expect(mockNodeService.updateNode).toHaveBeenCalledWith(
        "node-123",
        updateData,
        expect.any(User)
      );
    });

    it("ArkTypeバリデーションエラーで400を返す", async () => {
      const token = await createToken();

      const invalidData = {
        title: 123, // should be string
      };

      const req = new Request("http://localhost/nodes/node-123", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidData),
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(400);
      expect(mockNodeService.updateNode).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /nodes/:id", () => {
    it("正常にノードを削除する", async () => {
      const token = await createToken();
      mockNodeService.deleteNode.mockResolvedValue(undefined);

      const req = new Request("http://localhost/nodes/node-123", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const body = await res.json() as SuccessResponse;
      expect(body.ok).toBe(true);

      expect(mockNodeService.deleteNode).toHaveBeenCalledWith(
        "node-123",
        expect.any(User)
      );
    });
  });

  describe("POST /nodes/:id/like", () => {
    it("正常にノードをライクする", async () => {
      const token = await createToken();
      mockNodeService.likeNode.mockResolvedValue(undefined);

      const req = new Request("http://localhost/nodes/node-123/like", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const body = await res.json() as SuccessResponse;
      expect(body.ok).toBe(true);

      expect(mockNodeService.likeNode).toHaveBeenCalledWith(
        "node-123",
        expect.any(User)
      );
    });
  });

  describe("DELETE /nodes/:id/like", () => {
    it("正常にノードのライクを取り消す", async () => {
      const token = await createToken();
      mockNodeService.unlikeNode.mockResolvedValue(undefined);

      const req = new Request("http://localhost/nodes/node-123/like", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const body = await res.json() as SuccessResponse;
      expect(body.ok).toBe(true);

      expect(mockNodeService.unlikeNode).toHaveBeenCalledWith(
        "node-123",
        expect.any(User)
      );
    });
  });

  describe("GET /nodes/:id/likes", () => {
    it("正常にライク一覧を返す", async () => {
      const token = await createToken();
      const mockLikes = [
        {
          user_id: "user-1",
          name: "User One",
          email: "user1@example.com",
          created_at: "2023-01-01T00:00:00.000Z",
        },
      ];
      mockNodeService.getNodeLikes.mockResolvedValue(mockLikes);

      const req = new Request("http://localhost/nodes/node-123/likes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toEqual(mockLikes);

      expect(mockNodeService.getNodeLikes).toHaveBeenCalledWith("node-123");
    });
  });
});