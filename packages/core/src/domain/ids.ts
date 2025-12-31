/**
 * ドメイン固有のID型定義（ArkType + ブランド型）
 *
 * ArkTypeのブランド型機能を使用してID間のミスマッチを防ぐ
 * 例：UserId と NodeId を混同することをコンパイル時に検出
 *
 * ArkTypeの哲学：
 * - エッジでバリデーション：アプリ境界で厳密チェック
 * - 内部で安全使用：ドメイン内では有効と仮定
 */

import { type } from "arktype";

/**
 * ArkTypeバリデーションスキーマ（ブランド型付き）
 */
const userIdSchema = type(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const googleIdSchema = type(/^[0-9]+$/);
const nodeIdSchema = type(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const edgeIdSchema = type(/^[0-9A-HJKMNP-TV-Z]{26}$/);

/**
 * ブランド型定義（手動定義 + ArkTypeバリデーション）
 */
export type UserId = string & { readonly __brand: "UserId" };
export type GoogleId = string & { readonly __brand: "GoogleId" };
export type NodeId = string & { readonly __brand: "NodeId" };
export type EdgeId = string & { readonly __brand: "EdgeId" };

/**
 * 型安全なファクトリー関数（ArkTypeバリデーション付き）
 */
export const createUserId = (value: string): UserId => {
  const result = userIdSchema(value);
  if (result instanceof type.errors) {
    throw new Error(`Invalid UserId format: ${result.summary}`);
  }
  return result as UserId;
};

export const createGoogleId = (value: string): GoogleId => {
  const result = googleIdSchema(value);
  if (result instanceof type.errors) {
    throw new Error(`Invalid GoogleId format: ${result.summary}`);
  }
  return result as GoogleId;
};

export const createNodeId = (value: string): NodeId => {
  const result = nodeIdSchema(value);
  if (result instanceof type.errors) {
    throw new Error(`Invalid NodeId (ULID) format: ${result.summary}`);
  }
  return result as NodeId;
};

export const createEdgeId = (value: string): EdgeId => {
  const result = edgeIdSchema(value);
  if (result instanceof type.errors) {
    throw new Error(`Invalid EdgeId (ULID) format: ${result.summary}`);
  }
  return result as EdgeId;
};

/**
 * ID作成用ファクトリー関数（型との衝突を避けるためオブジェクトでエクスポート）
 */
export const ID = {
  UserId: createUserId,
  GoogleId: createGoogleId,
  NodeId: createNodeId,
  EdgeId: createEdgeId,
} as const;

/**
 * バリデーションなしの安全でない変換（テスト用など）
 */
export const unsafeUserId = (value: string): UserId => value as UserId;
export const unsafeGoogleId = (value: string): GoogleId => value as GoogleId;
export const unsafeNodeId = (value: string): NodeId => value as NodeId;
export const unsafeEdgeId = (value: string): EdgeId => value as EdgeId;

/**
 * 文字列への変換
 */
export const unwrapId = <T extends string>(id: T): string => id;

