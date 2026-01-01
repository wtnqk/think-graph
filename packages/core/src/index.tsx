import { Hono } from "hono";
import { logger } from "hono/logger";
import { authMiddleware } from "./middleware/auth";
import { renderer } from "./renderer";
import { api } from "./routes/api";
import { auth } from "./routes/auth";
import { edges } from "./routes/edges";
import { nodes } from "./routes/nodes";
import { sync } from "./routes/sync";

// Export Durable Object class for Cloudflare Workers
export { YjsSyncDO } from "./durable-objects";

type Bindings = {
	DB: D1Database;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	JWT_SECRET: string;
	YJS_SYNC: DurableObjectNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(logger());
app.use(renderer);

app.route("/auth", auth);
app.route("/sync", sync);

const apiRouter = new Hono<{ Bindings: Bindings }>()
	.use("*", authMiddleware)
	.route("/", api)
	.route("/nodes", nodes)
	.route("/edges", edges);

app.route("/api", apiRouter);

app.get("/", (c) => {
	return c.render(<h1>Hello!</h1>);
});

// Auth success page to handle token
app.get("/auth/success", (c) => {
	return c.html(`
		<!DOCTYPE html>
		<html>
		<head>
			<title>Authentication Success</title>
		</head>
		<body>
			<h1>Authentication Successful</h1>
			<p>Redirecting...</p>
			<script>
				const params = new URLSearchParams(window.location.search);
				const token = params.get('token');
				const redirect = params.get('redirect') || '/';

				if (token) {
					// Store token in localStorage
					localStorage.setItem('auth_token', token);

					// Redirect to intended page
					window.location.href = redirect;
				} else {
					console.error('No token received');
				}
			</script>
		</body>
		</html>
	`);
});

export default app;
