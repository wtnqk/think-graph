import { describe, it, expect, beforeEach, vi } from "vitest";
import { User, createEmail, createUserName } from "./user.js";
import { ID } from "./ids.js";

// Mock Date for consistent timestamps
vi.spyOn(Date.prototype, "toISOString").mockReturnValue("2023-01-01T00:00:00.000Z");

describe("User Domain Object", () => {
  describe("User.fromData", () => {
    it("データからユーザーを作成する", () => {
      const data = {
        id: "550e8400-e29b-41d4-a716-446655440000" as import("./ids.js").UserId,
        google_id: "123456789" as import("./ids.js").GoogleId,
        email: createEmail("test@example.com"),
        name: createUserName("Test User"),
        created_at: "2023-01-01T00:00:00.000Z",
        updated_at: "2023-01-01T00:00:00.000Z",
      };

      const user = User.fromData(data);

      expect(user.id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(user.googleId).toBe("123456789");
      expect(user.email).toBe("test@example.com");
      expect(user.name).toBe("Test User");
      expect(user.createdAt).toBe("2023-01-01T00:00:00.000Z");
      expect(user.updatedAt).toBe("2023-01-01T00:00:00.000Z");
    });
  });

  describe("User.fromJwtPayload", () => {
    it("should create user from JWT payload", () => {
      const payload = {
        sub: ID.UserId("550e8400-e29b-41d4-a716-446655440000"),
        email: createEmail("test@example.com"),
        name: createUserName("Test User"),
        exp: 1672531200,
      };

      const user = User.fromJwtPayload(payload);

      expect(user.id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(user.email).toBe("test@example.com");
      expect(user.name).toBe("Test User");
      expect(user.googleId).toBe("123456789"); // テスト用GoogleId
      expect(user.createdAt).toBe(""); // JWT doesn't contain timestamps
    });
  });

  describe("User.updateProfile", () => {
    let user: User;

    beforeEach(() => {
      const data = {
        id: "550e8400-e29b-41d4-a716-446655440000" as import("./ids.js").UserId,
        google_id: "123456789" as import("./ids.js").GoogleId,
        email: createEmail("old@example.com"),
        name: createUserName("Old Name"),
        created_at: "2023-01-01T00:00:00.000Z",
        updated_at: "2023-01-01T00:00:00.000Z",
      };
      user = User.fromData(data);
    });

    it("should update name and email", () => {
      user.updateProfile("New Name", "new@example.com");

      expect(user.name).toBe("New Name");
      expect(user.email).toBe("new@example.com");
      expect(user.updatedAt).toBe("2023-01-01T00:00:00.000Z");
    });

    it("should trim whitespace from name and email", () => {
      user.updateProfile("  Trimmed Name  ", "  trimmed@example.com  ");

      expect(user.name).toBe("Trimmed Name");
      expect(user.email).toBe("trimmed@example.com");
    });

    it("should convert email to lowercase", () => {
      user.updateProfile("Test User", "UPPER@EXAMPLE.COM");

      expect(user.email).toBe("upper@example.com");
    });

    it("should throw error for empty name", () => {
      expect(() => user.updateProfile("", "test@example.com")).toThrow("Invalid user name");
    });

    it("should throw error for whitespace-only name", () => {
      expect(() => user.updateProfile("   ", "test@example.com")).toThrow("Invalid user name");
    });

    it("should throw error for name too long", () => {
      const longName = "x".repeat(101);
      expect(() => user.updateProfile(longName, "test@example.com")).toThrow("Invalid user name");
    });

    it("should throw error for empty email", () => {
      expect(() => user.updateProfile("Test User", "")).toThrow("Invalid email format");
    });

    it("should throw error for invalid email format", () => {
      const invalidEmails = [
        "invalid-email",
        "@example.com",
        "test@",
        "test.example.com",
        "test@.com",
        "test@example.",
      ];

      invalidEmails.forEach((email) => {
        expect(() => user.updateProfile("Test User", email)).toThrow("Invalid email format");
      });
    });

    it("should accept valid email formats", () => {
      const validEmails = [
        "test@example.com",
        "user.name@example.com",
        "user+tag@example.co.uk",
        "123@456.org",
      ];

      validEmails.forEach((email) => {
        expect(() => user.updateProfile("Test User", email)).not.toThrow();
      });
    });
  });

  describe("User serialization", () => {
    let user: User;

    beforeEach(() => {
      const data = {
        id: "550e8400-e29b-41d4-a716-446655440000" as import("./ids.js").UserId,
        google_id: "123456789" as import("./ids.js").GoogleId,
        email: createEmail("test@example.com"),
        name: createUserName("Test User"),
        created_at: "2023-01-01T00:00:00.000Z",
        updated_at: "2023-01-01T00:00:00.000Z",
      };
      user = User.fromData(data);
    });

    it("should convert to data object", () => {
      const data = user.toData();

      expect(data).toEqual({
        id: "550e8400-e29b-41d4-a716-446655440000",
        google_id: "123456789",
        email: createEmail("test@example.com"),
        name: createUserName("Test User"),
        created_at: "2023-01-01T00:00:00.000Z",
        updated_at: "2023-01-01T00:00:00.000Z",
      });
    });

    it("should convert to JSON", () => {
      const json = user.toJSON();

      expect(json).toEqual(user.toData());
    });

    it("should convert to JWT payload", () => {
      const payload = user.toJwtPayload();

      expect(payload).toEqual({
        sub: "550e8400-e29b-41d4-a716-446655440000",
        email: createEmail("test@example.com"),
        name: createUserName("Test User"),
        exp: expect.any(Number),
      });

      // Check that exp is a reasonable future timestamp
      const now = Math.floor(Date.now() / 1000);
      const oneWeek = 7 * 24 * 60 * 60;
      expect(payload.exp).toBeGreaterThan(now);
      expect(payload.exp).toBeLessThanOrEqual(now + oneWeek + 1);
    });

    it("should accept custom expiration time", () => {
      const customExpiration = 3600; // 1 hour
      const payload = user.toJwtPayload(customExpiration);

      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBe(now + customExpiration);
    });
  });
});

