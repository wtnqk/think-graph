// Use relative URLs in development to go through Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export class Auth {
	private static cachedUser: { id: string; email: string; name: string } | null = null;
	private static authChecked = false;

	static async isAuthenticated(): Promise<boolean> {
		const user = await Auth.getCurrentUser();
		return user !== null;
	}

	static async getCurrentUser() {
		if (Auth.authChecked && Auth.cachedUser !== null) {
			return Auth.cachedUser;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/auth/me`, {
				credentials: "include", // Send cookies
			});

			if (!response.ok) {
				Auth.cachedUser = null;
				Auth.authChecked = true;
				return null;
			}

			Auth.cachedUser = await response.json();
			Auth.authChecked = true;
			return Auth.cachedUser;
		} catch (error) {
			console.error("Failed to get current user:", error);
			Auth.cachedUser = null;
			Auth.authChecked = true;
			return null;
		}
	}

	static login() {
		const redirectTo = encodeURIComponent(window.location.origin + "/");
		window.location.href = `${API_BASE_URL}/auth/google?redirect=${redirectTo}`;
	}

	static async logout() {
		try {
			await fetch(`${API_BASE_URL}/auth/logout`, {
				method: "POST",
				credentials: "include",
			});
		} catch (error) {
			console.error("Failed to logout:", error);
		}
		Auth.cachedUser = null;
		Auth.authChecked = false;
		window.location.href = "/login";
	}

	static clearCache() {
		Auth.cachedUser = null;
		Auth.authChecked = false;
	}
}
