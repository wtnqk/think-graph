import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";

type Bindings = {
	DB: D1Database;
	JWT_SECRET: string;
};

type Variables = {
	user: {
		sub: string;
		email: string;
		name: string;
	};
};

const api = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// 認証が必要なルート
api.use("/*", authMiddleware);

// 現在のユーザー情報
api.get("/me", (c) => {
	const user = c.get("user");
	return c.json({
		id: user.sub,
		email: user.email,
		name: user.name,
	});
});

export { api };
