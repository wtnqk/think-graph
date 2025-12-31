import { type } from "arktype";
import type { UserId, GoogleId } from "./ids.js";
import { ID } from "./ids.js";

/**
 * User関連の値オブジェクト
 */
const emailSchema = type(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
const userNameSchema = type("1<=string<=100");

export type Email = string & { readonly __brand: "Email" };
export type UserName = string & { readonly __brand: "UserName" };

export const createEmail = (value: string): Email => {
  const trimmed = value.trim().toLowerCase();
  const result = emailSchema(trimmed);
  if (result instanceof type.errors) {
    throw new Error(`Invalid email format: ${result.summary}`);
  }
  return result as Email;
};

export const createUserName = (value: string): UserName => {
  const trimmed = value.trim();
  const result = userNameSchema(trimmed);
  if (result instanceof type.errors) {
    throw new Error(`Invalid user name: ${result.summary}`);
  }
  return result as UserName;
};

export interface UserData {
  id: UserId;
  google_id: GoogleId;
  email: Email;
  name: UserName;
  created_at: string;
  updated_at: string;
}

export interface JwtPayload {
  sub: UserId;
  email: Email;
  name: UserName;
  exp: number;
}

export class User {
  private constructor(private data: UserData) {}

  static fromData(data: UserData): User {
    return new User(data);
  }

  static fromJwtPayload(payload: JwtPayload): User {
    // JWTペイロードから簡易Userオブジェクトを作成（認証済み前提）
    return new User({
      id: ID.UserId(payload.sub as string), // UserId型に変換
      google_id: ID.GoogleId("123456789"), // テスト用GoogleId
      email: payload.email,
      name: payload.name,
      created_at: "", // JWT内には含まれない
      updated_at: "", // JWT内には含まれない
    });
  }

  updateProfile(name: string, email: string): void {
    // ブランド型を使用してバリデーション
    const validName = createUserName(name);
    const validEmail = createEmail(email);

    this.data.name = validName;
    this.data.email = validEmail;
    this.data.updated_at = new Date().toISOString();
  }

  // Getters
  get id(): UserId {
    return this.data.id;
  }

  get googleId(): GoogleId {
    return this.data.google_id;
  }

  get email(): Email {
    return this.data.email;
  }

  get name(): UserName {
    return this.data.name;
  }

  get createdAt(): string {
    return this.data.created_at;
  }

  get updatedAt(): string {
    return this.data.updated_at;
  }

  toData(): UserData {
    return { ...this.data };
  }

  toJSON(): UserData {
    return this.toData();
  }

  toJwtPayload(expiresIn: number = 7 * 24 * 60 * 60): JwtPayload {
    return {
      sub: this.data.id,
      email: this.data.email,
      name: this.data.name,
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    };
  }

  // バリデーションはブランド型のファクトリー関数で実行
}

// ドメインエラークラス
export class UserError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "UserError";
  }
}

export class UserNotFoundError extends UserError {
  constructor(id: string) {
    super(`User with id ${id} not found`, "USER_NOT_FOUND");
  }
}