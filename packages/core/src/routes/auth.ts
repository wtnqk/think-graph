import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { createDb } from "../lib/db";

type Bindings = {
	DB: D1Database;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	JWT_SECRET: string;
};

const auth = new Hono<{ Bindings: Bindings }>();

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

auth.get("/google", (c) => {
	const redirectTo = c.req.query("redirect") || "/";
	setCookie(c, "auth_redirect", redirectTo, {
		httpOnly: true,
		secure: true,
		sameSite: "Lax",
		maxAge: 60 * 10, // 10 minutes
	});

	const redirectUri = new URL(c.req.url).origin + "/auth/google/callback";
	const params = new URLSearchParams({
		client_id: c.env.GOOGLE_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: "openid email profile",
		access_type: "offline",
	});

	return c.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

auth.get("/google/callback", async (c) => {
	const code = c.req.query("code");
	if (!code) {
		return c.text("Missing authorization code", 400);
	}

	const redirectUri = new URL(c.req.url).origin + "/auth/google/callback";

	// Exchange code for tokens
	const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			client_id: c.env.GOOGLE_CLIENT_ID,
			client_secret: c.env.GOOGLE_CLIENT_SECRET,
			redirect_uri: redirectUri,
			grant_type: "authorization_code",
		}),
	});

	if (!tokenRes.ok) {
		return c.text("Failed to exchange code for token", 500);
	}

	const tokens = (await tokenRes.json()) as { access_token: string };

	// Fetch user info
	const userRes = await fetch(GOOGLE_USERINFO_URL, {
		headers: { Authorization: `Bearer ${tokens.access_token}` },
	});

	if (!userRes.ok) {
		return c.text("Failed to fetch user info", 500);
	}

	const googleUser = (await userRes.json()) as {
		id: string;
		email: string;
		name: string;
	};

	// Upsert user
	const db = createDb(c.env.DB);
	let user = await db
		.selectFrom("users")
		.selectAll()
		.where("google_id", "=", googleUser.id)
		.executeTakeFirst();

	if (user) {
		// Update existing user
		await db
			.updateTable("users")
			.set({
				email: googleUser.email,
				name: googleUser.name,
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", user.id)
			.execute();
	} else {
		// Create new user
		const id = crypto.randomUUID();
		await db
			.insertInto("users")
			.values({
				id,
				google_id: googleUser.id,
				email: googleUser.email,
				name: googleUser.name,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.execute();
		user = {
			id,
			google_id: googleUser.id,
			email: googleUser.email,
			name: googleUser.name,
			created_at: "",
			updated_at: "",
		};
	}

	// Create JWT
	const token = await sign(
		{
			sub: user.id,
			email: user.email,
			name: user.name,
			exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
		},
		c.env.JWT_SECRET,
	);

	const redirectTo = getCookie(c, "auth_redirect") || "/";
	deleteCookie(c, "auth_redirect");

	// Return token in URL for client to handle
	const baseUrl = new URL(c.req.url).origin;
	return c.redirect(
		`${baseUrl}/auth/success?token=${token}&redirect=${encodeURIComponent(redirectTo)}`,
	);
});

auth.post("/logout", (c) => {
	// Client should remove token from storage
	return c.json({ ok: true });
});

// Add endpoint to verify token and get user info
auth.get("/me", async (c) => {
	const authHeader = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const token = authHeader.substring(7);

	try {
		const { verify } = await import("hono/jwt");
		const payload = await verify(token, c.env.JWT_SECRET);
		return c.json({
			id: payload.sub,
			email: payload.email,
			name: payload.name,
		});
	} catch {
		return c.json({ error: "Invalid token" }, 401);
	}
});

export { auth };
