import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createRoutes } from "./src/routes/index.ts";
import { SERVER_CONFIG } from "./src/config/constants.ts";

const app = createRoutes();

// Serve static files
app.use("/*", serveStatic({ root: "./public" }));

serve(
  {
    fetch: app.fetch,
    port: SERVER_CONFIG.PORT,
  },
  (info) => {
    console.log(`🚀 Server running at http://localhost:${info.port}`);
  },
);
