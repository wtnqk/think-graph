import { createMiddleware } from "hono/factory";
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
	const authHeader = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const token = authHeader.substring(7);

	try {
		const payload = (await verify(token, c.env.JWT_SECRET)) as JwtPayload;
		c.set("user", payload);
		await next();
	} catch {
		return c.json({ error: "Invalid token" }, 401);
	}
});
