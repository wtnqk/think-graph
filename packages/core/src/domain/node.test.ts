import { describe, it, expect, beforeEach, vi } from "vitest";
import { Node } from "./node.js";
import { ID } from "./ids.js";

// Mock ulid for predictable IDs (valid ULID format)
vi.mock("ulid", () => ({
  ulid: vi.fn(() => "01ARZ3NDEKTSV4RRFFQ69G5FAV"),
}));

// Mock Date for consistent timestamps
vi.spyOn(Date.prototype, "toISOString").mockReturnValue("2023-01-01T00:00:00.000Z");

describe("Node Domain Object", () => {
  describe("Node.create", () => {
    it("有効なデータでノードを作成する", () => {
      const input = {
        type: "idea" as const,
        title: "Test Idea",
        content: "Test content",
      };

      const node = Node.create(input, ID.UserId("550e8400-e29b-41d4-a716-446655440000"));

      expect(node.id).toBe("01ARZ3NDEKTSV4RRFFQ69G5FAV");
      expect(node.type).toBe("idea");
      expect(node.title).toBe("Test Idea");
      expect(node.content).toBe("Test content");
      expect(node.ownerId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(node.parentId).toBeNull();
      expect(node.createdAt).toBe("2023-01-01T00:00:00.000Z");
      expect(node.updatedAt).toBe("2023-01-01T00:00:00.000Z");
    });

    it("親ノード付きでノードを作成する", () => {
      const input = {
        type: "comment" as const,
        title: "Child Comment",
        content: "Child content",
        parent_id: ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAV"),
      };

      const node = Node.create(input, ID.UserId("550e8400-e29b-41d4-a716-446655440000"));

      expect(node.parentId).toBe("01ARZ3NDEKTSV4RRFFQ69G5FAV");
      expect(node.hasParent()).toBe(true);
    });

    it("タイトルとコンテンツから空白を削除する", () => {
      const input = {
        type: "idea" as const,
        title: "  Trimmed Title  ",
        content: "  Trimmed Content  ",
      };

      const node = Node.create(input, ID.UserId("550e8400-e29b-41d4-a716-446655440000"));

      expect(node.title).toBe("Trimmed Title");
      expect(node.content).toBe("Trimmed Content");
    });

    it("should handle null content", () => {
      const input = {
        type: "idea" as const,
        title: "Test Title",
        content: null,
      };

      const node = Node.create(input, ID.UserId("550e8400-e29b-41d4-a716-446655440000"));

      expect(node.content).toBeNull();
    });

    it("空のタイトルでエラーを投げる", () => {
      const input = {
        type: "idea" as const,
        title: "",
      };

      expect(() => Node.create(input, ID.UserId("550e8400-e29b-41d4-a716-446655440000"))).toThrow("Title is required");
    });

    it("空白のみのタイトルでエラーを投げる", () => {
      const input = {
        type: "idea" as const,
        title: "   ",
      };

      expect(() => Node.create(input, ID.UserId("550e8400-e29b-41d4-a716-446655440000"))).toThrow("Title is required");
    });

    it("長すぎるタイトルでエラーを投げる", () => {
      const input = {
        type: "idea" as const,
        title: "x".repeat(256),
      };

      expect(() => Node.create(input, ID.UserId("550e8400-e29b-41d4-a716-446655440000"))).toThrow("Title must be 255 characters or less");
    });

    it("無効なノード種別でエラーを投げる", () => {
      const input = {
        type: "invalid",
        title: "Test",
      } as const;

      // @ts-expect-error - 意図的に無効な型でテスト
      expect(() => Node.create(input, ID.UserId("550e8400-e29b-41d4-a716-446655440000"))).toThrow("Invalid node type: invalid");
    });

    it("should accept all valid node types", () => {
      const validTypes = ["issue", "idea", "output", "comment"] as const;

      validTypes.forEach((type) => {
        const node = Node.create({ type, title: "Test" }, ID.UserId("550e8400-e29b-41d4-a716-446655440000"));
        expect(node.type).toBe(type);
        expect(node.isType(type)).toBe(true);
      });
    });
  });

  describe("Node.fromData", () => {
    it("should create node from data", () => {
      const data = {
        id: ID.NodeId("01ARZ3NDEKTSV4RRFFQ69G5FAV"),
        type: "idea" as const,
        title: "Existing Idea",
        content: "Existing content",
        parent_id: null,
        owner_id: ID.UserId("550e8400-e29b-41d4-a716-446655440000"),
        created_at: "2023-01-01T12:00:00.000Z",
        updated_at: "2023-01-01T13:00:00.000Z",
      };

      const node = Node.fromData(data);

      expect(node.id).toBe("01ARZ3NDEKTSV4RRFFQ69G5FAV");
      expect(node.title).toBe("Existing Idea");
      expect(node.ownerId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(node.createdAt).toBe("2023-01-01T12:00:00.000Z");
      expect(node.updatedAt).toBe("2023-01-01T13:00:00.000Z");
    });
  });

  describe("Node.update", () => {
    let node: Node;

    beforeEach(() => {
      node = Node.create(
        { type: "idea", title: "Original Title", content: "Original content" },
        ID.UserId("550e8400-e29b-41d4-a716-446655440000"),
      );
    });

    it("should update title when user is owner", () => {
      node.update({ title: "Updated Title" }, ID.UserId("550e8400-e29b-41d4-a716-446655440000"));

      expect(node.title).toBe("Updated Title");
      expect(node.updatedAt).toBe("2023-01-01T00:00:00.000Z");
    });

    it("should update content when user is owner", () => {
      node.update({ content: "Updated content" }, ID.UserId("550e8400-e29b-41d4-a716-446655440000"));

      expect(node.content).toBe("Updated content");
    });

    it("should update both title and content", () => {
      node.update({ title: "New Title", content: "New content" }, ID.UserId("550e8400-e29b-41d4-a716-446655440000"));

      expect(node.title).toBe("New Title");
      expect(node.content).toBe("New content");
    });

    it("should set content to null when explicitly set", () => {
      node.update({ content: null }, ID.UserId("550e8400-e29b-41d4-a716-446655440000"));

      expect(node.content).toBeNull();
    });

    it("should trim whitespace from updated values", () => {
      node.update({ title: "  Trimmed Update  ", content: "  Trimmed Content  " }, ID.UserId("550e8400-e29b-41d4-a716-446655440000"));

      expect(node.title).toBe("Trimmed Update");
      expect(node.content).toBe("Trimmed Content");
    });

    it("should throw error when user is not owner", () => {
      expect(() => node.update({ title: "Hacked Title" }, ID.UserId("01bf5ff0-bfac-4af9-8eff-effff0000001"))).toThrow(
        "Only the owner can update this node",
      );
    });

    it("should validate title on update", () => {
      expect(() => node.update({ title: "" }, ID.UserId("550e8400-e29b-41d4-a716-446655440000"))).toThrow("Title is required");

      expect(() => node.update({ title: "x".repeat(256) }, ID.UserId("550e8400-e29b-41d4-a716-446655440000"))).toThrow(
        "Title must be 255 characters or less",
      );
    });

    it("should not update when no changes provided", () => {
      const originalTitle = node.title;
      const originalContent = node.content;

      node.update({}, ID.UserId("550e8400-e29b-41d4-a716-446655440000"));

      expect(node.title).toBe(originalTitle);
      expect(node.content).toBe(originalContent);
    });
  });

  describe("Node.delete", () => {
    let node: Node;

    beforeEach(() => {
      node = Node.create({ type: "idea", title: "To Delete" }, ID.UserId("550e8400-e29b-41d4-a716-446655440000"));
    });

    it("should allow deletion when user is owner", () => {
      expect(() => node.delete(ID.UserId("550e8400-e29b-41d4-a716-446655440000"))).not.toThrow();
    });

    it("should throw error when user is not owner", () => {
      expect(() => node.delete(ID.UserId("01bf5ff0-bfac-4af9-8eff-effff0000001"))).toThrow("Only the owner can delete this node");
    });
  });

  describe("Node ownership and permissions", () => {
    let node: Node;

    beforeEach(() => {
      node = Node.create({ type: "idea", title: "Test" }, ID.UserId("550e8400-e29b-41d4-a716-446655440000"));
    });

    it("should identify owner correctly", () => {
      expect(node.isOwner(ID.UserId("550e8400-e29b-41d4-a716-446655440000"))).toBe(true);
      expect(node.isOwner(ID.UserId("01bf5ff0-bfac-4af9-8eff-effff0000001"))).toBe(false);
    });

    it("should allow viewing by any user", () => {
      expect(node.canBeViewedBy(ID.UserId("550e8400-e29b-41d4-a716-446655440000"))).toBe(true);
      expect(node.canBeViewedBy(ID.UserId("01bf5ff0-bfac-4af9-8eff-effff0000001"))).toBe(true);
      expect(node.canBeViewedBy(ID.UserId("01bf5ff0-bfac-4af9-8eff-effff0000002"))).toBe(true);
    });
  });

  describe("Node serialization", () => {
    it("should convert to data object", () => {
      const node = Node.create({ type: "idea", title: "Test", content: "Content" }, ID.UserId("550e8400-e29b-41d4-a716-446655440000"));

      const data = node.toData();

      expect(data).toEqual({
        id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        type: "idea",
        title: "Test",
        content: "Content",
        parent_id: null,
        owner_id: ID.UserId("550e8400-e29b-41d4-a716-446655440000"),
        created_at: "2023-01-01T00:00:00.000Z",
        updated_at: "2023-01-01T00:00:00.000Z",
      });
    });

    it("should convert to JSON", () => {
      const node = Node.create({ type: "idea", title: "Test" }, ID.UserId("550e8400-e29b-41d4-a716-446655440000"));

      const json = node.toJSON();

      expect(json).toEqual(node.toData());
    });
  });
});

