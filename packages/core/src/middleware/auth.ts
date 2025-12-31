import { createMiddleware } from "hono/factory";
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
	const authHeader = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const token = authHeader.substring(7);

	try {
		const payload = await verify(token, c.env.JWT_SECRET);
		// JWTペイロードをJwtPayload型にキャスト（JWTの中身は信頼済み）
		c.set("user", payload as unknown as JwtPayload);
		await next();
	} catch {
		return c.json({ error: "Invalid token" }, 401);
	}
});
