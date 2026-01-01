import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { createDb } from "../lib/db";
import { ID, type UserId, type GoogleId } from "../domain/ids.js";
import { createEmail, createUserName, type Email, type UserName } from "../domain/user.js";

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
		secure: false, // false for localhost development
		sameSite: "Lax",
		maxAge: 60 * 10, // 10 minutes
	});

	// Use the origin from redirect parameter if provided, otherwise use request origin
	// This allows the callback to go through the Vite proxy in development
	let callbackOrigin: string;
	try {
		callbackOrigin = new URL(redirectTo).origin;
	} catch {
		callbackOrigin = new URL(c.req.url).origin;
	}
	const redirectUri = callbackOrigin + "/auth/google/callback";
	console.log("redirectTo:", redirectTo, "callbackOrigin:", callbackOrigin, "redirectUri:", redirectUri);
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

	// Get the redirect URL from cookie to determine the correct origin for callback
	const authRedirect = getCookie(c, "auth_redirect") || "/";
	let callbackOrigin: string;
	try {
		callbackOrigin = new URL(authRedirect).origin;
	} catch {
		callbackOrigin = new URL(c.req.url).origin;
	}
	const redirectUri = callbackOrigin + "/auth/google/callback";

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

	// Convert to branded types
	const googleId = ID.GoogleId(googleUser.id);
	const email = createEmail(googleUser.email);
	const userName = createUserName(googleUser.name);

	// Upsert user
	const db = createDb(c.env.DB);
	let user = await db
		.selectFrom("users")
		.selectAll()
		.where("google_id", "=", googleId)
		.executeTakeFirst();

	if (user) {
		// Update existing user
		await db
			.updateTable("users")
			.set({
				email: email,
				name: userName,
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", user.id)
			.execute();
	} else {
		// Create new user
		const id = ID.UserId(crypto.randomUUID());
		const now = new Date().toISOString();
		await db
			.insertInto("users")
			.values({
				id,
				google_id: googleId,
				email: email,
				name: userName,
				created_at: now,
				updated_at: now,
			})
			.execute();
		user = {
			id,
			google_id: googleId,
			email: email,
			name: userName,
			created_at: now,
			updated_at: now,
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

	// Set JWT as HttpOnly cookie
	setCookie(c, "auth_token", token, {
		httpOnly: true,
		secure: false, // TODO: true in production
		sameSite: "Lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 7, // 7 days
	});

	return c.redirect(redirectTo);
});

auth.post("/logout", (c) => {
	deleteCookie(c, "auth_token", { path: "/" });
	return c.json({ ok: true });
});

// Add endpoint to verify token and get user info
auth.get("/me", async (c) => {
	// Check cookie first, then Authorization header
	let token = getCookie(c, "auth_token");

	if (!token) {
		const authHeader = c.req.header("Authorization");
		if (authHeader?.startsWith("Bearer ")) {
			token = authHeader.substring(7);
		}
	}

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

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
