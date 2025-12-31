import type { NodeType } from "../domain/node.js";

// API Response Types
export interface NodeResponse {
  id: string;
  type: NodeType;
  title: string;
  content: string | null;
  parentId: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EdgeResponse {
  id: string;
  source_id: string;
  target_id: string;
  created_at: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
}

export interface LikeResponse {
  user_id: string;
  name: string;
  email: string;
  created_at: string;
}

// API Error Response
export interface ErrorResponse {
  error: string;
}

// Common API Responses
export interface SuccessResponse {
  ok: boolean;
}