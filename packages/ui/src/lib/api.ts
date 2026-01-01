import { type } from "arktype";
import { Auth } from "./auth";
import type { ApiEdge, ApiNode } from "./types";
import { ApiEdgeSchema, ApiNodeSchema } from "./types";

// Use relative URLs in development to go through Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export class ApiClient {
	private static async request<T>(
		endpoint: string,
		options: RequestInit = {},
		validator?: (data: unknown) => T,
	): Promise<T> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};

		if (options.headers) {
			Object.assign(headers, options.headers);
		}

		const response = await fetch(`${API_BASE_URL}${endpoint}`, {
			...options,
			headers,
			credentials: "include", // Send cookies
		});

		if (response.status === 401) {
			Auth.clearCache();
			window.location.href = "/login";
			throw new Error("Unauthorized");
		}

		if (!response.ok) {
			throw new Error(`API Error: ${response.status}`);
		}

		const data: unknown = await response.json();

		if (validator) {
			return validator(data);
		}

		return data as T;
	}

	// Nodes API
	static async getNodes(): Promise<ApiNode[]> {
		const ArrayOfNodes = ApiNodeSchema.array();
		return ApiClient.request("/api/nodes", {}, (data) => {
			const result = ArrayOfNodes(data);
			if (result instanceof type.errors) {
				throw new Error(`Invalid nodes response: ${result.summary}`);
			}
			return result;
		});
	}

	static async createNode(data: {
		type: string;
		title: string;
		content?: string;
		parent_id?: string;
	}): Promise<ApiNode> {
		return ApiClient.request(
			"/api/nodes",
			{
				method: "POST",
				body: JSON.stringify(data),
			},
			(data) => {
				const result = ApiNodeSchema(data);
				if (result instanceof type.errors) {
					throw new Error(`Invalid node response: ${result.summary}`);
				}
				return result;
			},
		);
	}

	static async updateNode(
		id: string,
		data: Partial<{
			type: string;
			title: string;
			content: string;
			parent_id: string;
		}>,
	): Promise<ApiNode> {
		return ApiClient.request(`/api/nodes/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		});
	}

	static async deleteNode(id: string): Promise<void> {
		return ApiClient.request(`/api/nodes/${id}`, {
			method: "DELETE",
		});
	}

	// Edges API
	static async getEdges(): Promise<ApiEdge[]> {
		const ArrayOfEdges = ApiEdgeSchema.array();
		return ApiClient.request("/api/edges", {}, (data) => {
			const result = ArrayOfEdges(data);
			if (result instanceof type.errors) {
				throw new Error(`Invalid edges response: ${result.summary}`);
			}
			return result;
		});
	}

	static async createEdge(data: { source_id: string; target_id: string }): Promise<ApiEdge> {
		return ApiClient.request(
			"/api/edges",
			{
				method: "POST",
				body: JSON.stringify(data),
			},
			(data) => {
				const result = ApiEdgeSchema(data);
				if (result instanceof type.errors) {
					throw new Error(`Invalid edge response: ${result.summary}`);
				}
				return result;
			},
		);
	}

	static async deleteEdge(id: string): Promise<void> {
		return ApiClient.request(`/api/edges/${id}`, {
			method: "DELETE",
		});
	}

	// Likes API
	static async likeNode(nodeId: string) {
		return ApiClient.request(`/api/nodes/${nodeId}/like`, {
			method: "POST",
		});
	}

	static async unlikeNode(nodeId: string) {
		return ApiClient.request(`/api/nodes/${nodeId}/unlike`, {
			method: "POST",
		});
	}
}
