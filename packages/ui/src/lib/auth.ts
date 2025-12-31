export class Auth {
	private static TOKEN_KEY = 'auth_token';

	static getToken(): string | null {
		if (typeof window === 'undefined') return null;
		return localStorage.getItem(this.TOKEN_KEY);
	}

	static setToken(token: string): void {
		if (typeof window === 'undefined') return;
		localStorage.setItem(this.TOKEN_KEY, token);
	}

	static removeToken(): void {
		if (typeof window === 'undefined') return;
		localStorage.removeItem(this.TOKEN_KEY);
	}

	static isAuthenticated(): boolean {
		return !!this.getToken();
	}

	static async getCurrentUser() {
		const token = this.getToken();
		if (!token) return null;

		try {
			const response = await fetch('http://localhost:3000/auth/me', {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (!response.ok) {
				this.removeToken();
				return null;
			}

			return await response.json();
		} catch (error) {
			console.error('Failed to get current user:', error);
			return null;
		}
	}

	static login() {
		window.location.href = 'http://localhost:3000/auth/google';
	}

	static logout() {
		this.removeToken();
		window.location.href = '/';
	}
}