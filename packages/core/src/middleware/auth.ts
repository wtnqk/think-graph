import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";

type JwtPayload = {
	sub: string;
	email: string;
	name: string;
	exp: number;
};

type Env = {
	Bindings: {
		JWT_SECRET: string;
	};
	Variables: {
		user: JwtPayload;
	};
};

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
	const token = getCookie(c, "token");

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	try {
		const payload = (await verify(token, c.env.JWT_SECRET)) as JwtPayload;
		c.set("user", payload);
		await next();
	} catch {
		return c.json({ error: "Invalid token" }, 401);
	}
});
