import { Auth } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiClient {
	private static async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const token = Auth.getToken();

		const headers: HeadersInit = {
			'Content-Type': 'application/json',
			...options.headers,
		};

		if (token) {
			headers['Authorization'] = `Bearer ${token}`;
		}

		const response = await fetch(`${API_BASE_URL}${endpoint}`, {
			...options,
			headers,
		});

		if (response.status === 401) {
			Auth.removeToken();
			window.location.href = '/login';
			throw new Error('Unauthorized');
		}

		if (!response.ok) {
			throw new Error(`API Error: ${response.status}`);
		}

		return response.json();
	}

	// Nodes API
	static async getNodes() {
		return this.request('/api/nodes');
	}

	static async createNode(data: {
		type: string;
		title: string;
		content?: string;
		parent_id?: string;
	}) {
		return this.request('/api/nodes', {
			method: 'POST',
			body: JSON.stringify(data),
		});
	}

	static async updateNode(id: string, data: Partial<{
		type: string;
		title: string;
		content: string;
		parent_id: string;
	}>) {
		return this.request(`/api/nodes/${id}`, {
			method: 'PUT',
			body: JSON.stringify(data),
		});
	}

	static async deleteNode(id: string) {
		return this.request(`/api/nodes/${id}`, {
			method: 'DELETE',
		});
	}

	// Edges API
	static async getEdges() {
		return this.request('/api/edges');
	}

	static async createEdge(data: {
		source_id: string;
		target_id: string;
	}) {
		return this.request('/api/edges', {
			method: 'POST',
			body: JSON.stringify(data),
		});
	}

	static async deleteEdge(id: string) {
		return this.request(`/api/edges/${id}`, {
			method: 'DELETE',
		});
	}

	// Likes API
	static async likeNode(nodeId: string) {
		return this.request(`/api/nodes/${nodeId}/like`, {
			method: 'POST',
		});
	}

	static async unlikeNode(nodeId: string) {
		return this.request(`/api/nodes/${nodeId}/unlike`, {
			method: 'POST',
		});
	}
}