import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import type { JwtPayload } from "../domain/user.js";

type Env = {
	Bindings: {
		JWT_SECRET: string;
	};
	Variables: {
		user: JwtPayload;
	};
};

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
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
		const payload = await verify(token, c.env.JWT_SECRET);
		// JWTペイロードをJwtPayload型にキャスト（JWTの中身は信頼済み）
		c.set("user", payload as unknown as JwtPayload);
		await next();
	} catch {
		return c.json({ error: "Invalid token" }, 401);
	}
});
