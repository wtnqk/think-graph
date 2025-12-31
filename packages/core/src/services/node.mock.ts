import { vi } from "vitest";

// Mock NodeService
export const mockNodeService = {
  getNodes: vi.fn(),
  getNodeById: vi.fn(),
  createNode: vi.fn(),
  updateNode: vi.fn(),
  deleteNode: vi.fn(),
  likeNode: vi.fn(),
  unlikeNode: vi.fn(),
  getNodeLikes: vi.fn(),
};

export type MockNodeServiceType = typeof mockNodeService;

export const MockNodeService = vi.fn(() => mockNodeService);