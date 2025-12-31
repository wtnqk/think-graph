import { describe, it, expect, beforeEach, vi } from "vitest";
import { NodeService } from "./node.js";
import { Node, NodeNotFoundError } from "../domain/node.js";
import { User, createEmail, createUserName } from "../domain/user.js";
import { ID } from "../domain/ids.js";
import type { DB } from "../lib/db.js";

// Mock database interface
const mockDb = {
  selectFrom: vi.fn(),
  insertInto: vi.fn(),
  updateTable: vi.fn(),
  deleteFrom: vi.fn(),
};

const mockQuery = {
  selectAll: vi.fn(() => mockQuery),
  select: vi.fn(() => mockQuery),
  where: vi.fn(() => mockQuery),
  innerJoin: vi.fn(() => mockQuery),
  set: vi.fn(() => mockQuery),
  values: vi.fn(() => mockQuery),
  execute: vi.fn(),
  executeTakeFirst: vi.fn(),
};

// Setup mock chains
beforeEach(() => {
  vi.clearAllMocks();
  mockDb.selectFrom.mockReturnValue(mockQuery);
  mockDb.insertInto.mockReturnValue(mockQuery);
  mockDb.updateTable.mockReturnValue(mockQuery);
  mockDb.deleteFrom.mockReturnValue(mockQuery);
});

const createTestUser = () => User.fromJwtPayload({
  sub: ID.UserId("550e8400-e29b-41d4-a716-446655440000"),
  email: createEmail("test@example.com"),
  name: createUserName("Test User"),
  exp: 1672531200,
});

const createSampleNodeData = (): import("../domain/node.js").NodeData => ({
  id: ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAV"),
  type: "idea" as const,
  title: "Test Idea",
  content: "Test content",
  parent_id: null,
  owner_id: ID.UserId("550e8400-e29b-41d4-a716-446655440000"),
  created_at: "2023-01-01T00:00:00.000Z",
  updated_at: "2023-01-01T00:00:00.000Z",
});

describe("NodeService", () => {
  let nodeService: NodeService;

  beforeEach(() => {
    nodeService = new NodeService(mockDb as unknown as DB);
  });

  describe("getNodes", () => {
    it("should return root nodes when no parentId provided", async () => {
      const sampleData = [createSampleNodeData()];
      mockQuery.execute.mockResolvedValue(sampleData);

      const result = await nodeService.getNodes();

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Node);
      expect(result[0].id).toBe("01ARZ3NDEKTSV4RRFFQ69G5FAV");
      expect(mockQuery.where).toHaveBeenCalledWith("parent_id", "is", null);
    });

    it("should filter by parentId when provided", async () => {
      const sampleData = [createSampleNodeData()];
      mockQuery.execute.mockResolvedValue(sampleData);

      const parentId = ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAW");
      const result = await nodeService.getNodes(parentId);

      expect(mockQuery.where).toHaveBeenCalledWith("parent_id", "=", parentId);
      expect(result).toHaveLength(1);
    });

    it("should return empty array when no nodes found", async () => {
      mockQuery.execute.mockResolvedValue([]);

      const result = await nodeService.getNodes();

      expect(result).toEqual([]);
    });
  });

  describe("getNodeById", () => {
    it("should return node when found", async () => {
      const sampleData = createSampleNodeData();
      mockQuery.executeTakeFirst.mockResolvedValue(sampleData);

      const nodeId = ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAV");
      const result = await nodeService.getNodeById(nodeId);

      expect(result).toBeInstanceOf(Node);
      expect(result?.id).toBe("01ARZ3NDEKTSV4RRFFQ69G5FAV");
      expect(mockQuery.where).toHaveBeenCalledWith("id", "=", nodeId);
    });

    it("should return null when node not found", async () => {
      mockQuery.executeTakeFirst.mockResolvedValue(undefined);

      const result = await nodeService.getNodeById(ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAX"));

      expect(result).toBeNull();
    });
  });

  describe("createNode", () => {
    it("should create node successfully", async () => {
      const user = createTestUser();
      const createInput = {
        type: "idea" as const,
        title: "New Idea",
        content: "Great idea content",
      };

      mockQuery.execute.mockResolvedValue([]);

      const result = await nodeService.createNode(createInput, user);

      expect(result).toBeInstanceOf(Node);
      expect(result.title).toBe("New Idea");
      expect(result.ownerId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(mockDb.insertInto).toHaveBeenCalledWith("nodes");
      expect(mockQuery.values).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "idea",
          title: "New Idea",
          content: "Great idea content",
          owner_id: "550e8400-e29b-41d4-a716-446655440000",
        })
      );
    });

    it("should handle optional fields correctly", async () => {
      const user = createTestUser();
      const createInput = {
        type: "comment" as const,
        title: "Comment",
        parent_id: ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAV"),
      };

      mockQuery.execute.mockResolvedValue([]);

      const result = await nodeService.createNode(createInput, user);

      expect(result.parentId).toBe("01ARZ3NDEKTSV4RRFFQ69G5FAV");
      expect(result.content).toBeNull();
    });

    it("should validate input through domain object", async () => {
      const user = createTestUser();
      const invalidInput = {
        type: "idea" as const,
        title: "", // Invalid empty title
      };

      await expect(nodeService.createNode(invalidInput, user)).rejects.toThrow("Title is required");
    });
  });

  describe("updateNode", () => {
    it("should update node when user is owner", async () => {
      const user = createTestUser();
      const existingData = createSampleNodeData();
      const updateInput = { title: "Updated Title" };

      mockQuery.executeTakeFirst.mockResolvedValue(existingData);
      mockQuery.execute.mockResolvedValue([]);

      const nodeId = ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAV");
      const result = await nodeService.updateNode(nodeId, updateInput, user);

      expect(result.title).toBe("Updated Title");
      expect(mockDb.updateTable).toHaveBeenCalledWith("nodes");
      expect(mockQuery.set).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated Title",
        })
      );
    });

    it("should throw NodeNotFoundError when node doesn't exist", async () => {
      const user = createTestUser();
      mockQuery.executeTakeFirst.mockResolvedValue(undefined);

      await expect(
        nodeService.updateNode(ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAX"), { title: "New Title" }, user)
      ).rejects.toThrow(NodeNotFoundError);
    });

    it("should throw error when user is not owner", async () => {
      const otherUser = User.fromJwtPayload({
        sub: ID.UserId("01bf5ff0-bfac-4af9-8eff-effff0000001"),
        email: createEmail("other@example.com"),
        name: createUserName("Other User"),
        exp: 1672531200,
      });
      const existingData = createSampleNodeData();

      mockQuery.executeTakeFirst.mockResolvedValue(existingData);

      await expect(
        nodeService.updateNode(ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAV"), { title: "Hacked" }, otherUser)
      ).rejects.toThrow("Only the owner can update this node");
    });
  });

  describe("deleteNode", () => {
    it("should delete node when user is owner", async () => {
      const user = createTestUser();
      const existingData = createSampleNodeData();

      mockQuery.executeTakeFirst.mockResolvedValue(existingData);
      mockQuery.execute.mockResolvedValue([]);

      const nodeId = ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAV");
      await nodeService.deleteNode(nodeId, user);

      expect(mockDb.deleteFrom).toHaveBeenCalledWith("nodes");
      expect(mockQuery.where).toHaveBeenCalledWith("id", "=", nodeId);
    });

    it("should throw NodeNotFoundError when node doesn't exist", async () => {
      const user = createTestUser();
      mockQuery.executeTakeFirst.mockResolvedValue(undefined);

      await expect(
        nodeService.deleteNode(ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAX"), user)
      ).rejects.toThrow(NodeNotFoundError);
    });

    it("should throw error when user is not owner", async () => {
      const otherUser = User.fromJwtPayload({
        sub: ID.UserId("01bf5ff0-bfac-4af9-8eff-effff0000001"),
        email: createEmail("other@example.com"),
        name: createUserName("Other User"),
        exp: 1672531200,
      });
      const existingData = createSampleNodeData();

      mockQuery.executeTakeFirst.mockResolvedValue(existingData);

      await expect(
        nodeService.deleteNode(ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAV"), otherUser)
      ).rejects.toThrow("Only the owner can delete this node");
    });
  });

  describe("likeNode", () => {
    it("should like existing node", async () => {
      const user = createTestUser();
      const existingData = createSampleNodeData();

      mockQuery.executeTakeFirst.mockResolvedValue(existingData);
      mockQuery.execute.mockResolvedValue([]);

      const nodeId = ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAV");
      await nodeService.likeNode(nodeId, user);

      expect(mockDb.insertInto).toHaveBeenCalledWith("node_likes");
      expect(mockQuery.values).toHaveBeenCalledWith({
        node_id: nodeId,
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        created_at: expect.any(String),
      });
    });

    it("should throw NodeNotFoundError when node doesn't exist", async () => {
      const user = createTestUser();
      mockQuery.executeTakeFirst.mockResolvedValue(undefined);

      await expect(
        nodeService.likeNode(ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAX"), user)
      ).rejects.toThrow(NodeNotFoundError);
    });

    it("should handle duplicate likes gracefully", async () => {
      const user = createTestUser();
      const existingData = createSampleNodeData();

      mockQuery.executeTakeFirst.mockResolvedValue(existingData);
      mockQuery.execute.mockRejectedValue(new Error("Duplicate entry"));

      // Should not throw
      await expect(
        nodeService.likeNode(ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAV"), user)
      ).resolves.toBeUndefined();
    });
  });

  describe("unlikeNode", () => {
    it("should unlike node", async () => {
      const user = createTestUser();
      mockQuery.execute.mockResolvedValue([]);

      const nodeId = ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAV");
      await nodeService.unlikeNode(nodeId, user);

      expect(mockDb.deleteFrom).toHaveBeenCalledWith("node_likes");
      expect(mockQuery.where).toHaveBeenCalledWith("node_id", "=", nodeId);
      expect(mockQuery.where).toHaveBeenCalledWith("user_id", "=", "550e8400-e29b-41d4-a716-446655440000");
    });
  });

  describe("getNodeLikes", () => {
    it("should return likes with count", async () => {
      const mockLikes = [
        { id: "user1", name: "User One", created_at: "2023-01-01T00:00:00.000Z" },
        { id: "user2", name: "User Two", created_at: "2023-01-01T00:00:00.000Z" },
      ];

      mockQuery.execute.mockResolvedValue(mockLikes);

      const result = await nodeService.getNodeLikes(ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAV"));

      expect(result).toEqual({
        likes: mockLikes,
        count: 2,
      });
      expect(mockQuery.innerJoin).toHaveBeenCalledWith("users", "users.id", "node_likes.user_id");
    });

    it("should return empty array when no likes", async () => {
      mockQuery.execute.mockResolvedValue([]);

      const result = await nodeService.getNodeLikes(ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAV"));

      expect(result).toEqual({
        likes: [],
        count: 0,
      });
    });
  });
});
