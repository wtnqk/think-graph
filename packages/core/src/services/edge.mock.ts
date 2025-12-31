import { vi } from "vitest";

// Mock error classes
export class MockEdgeCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EdgeCreationError";
  }
}

export class MockEdgeNotFoundError extends Error {
  constructor(id: string) {
    super(`Edge with id ${id} not found`);
    this.name = "EdgeNotFoundError";
  }
}

// Mock EdgeService
export const mockEdgeService = {
  getEdges: vi.fn(),
  createEdge: vi.fn(),
  deleteEdge: vi.fn(),
};

export type MockEdgeServiceType = typeof mockEdgeService;

export const MockEdgeService = vi.fn(() => mockEdgeService);