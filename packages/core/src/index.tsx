import { Hono } from "hono";
import { renderer } from "./renderer";
import { auth } from "./routes/auth";

type Bindings = {
	DB: D1Database;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(renderer);

app.route("/auth", auth);

app.get("/", (c) => {
	return c.render(<h1>Hello!</h1>);
});

export default app;
