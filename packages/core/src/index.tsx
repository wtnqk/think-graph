import { Hono } from "hono";
import { renderer } from "./renderer";
import { auth } from "./routes/auth";
import { api } from "./routes/api";
import { nodes } from "./routes/nodes";
import { edges } from "./routes/edges";

type Bindings = {
	DB: D1Database;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(renderer);

app.route("/auth", auth);
app.route("/api", api);
app.route("/api/nodes", nodes);
app.route("/api/edges", edges);

app.get("/", (c) => {
	return c.render(<h1>Hello!</h1>);
});

export default app;
