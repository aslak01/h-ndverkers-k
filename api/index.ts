import { Hono } from "hono";
import { handle } from "hono/vercel";
import { generateSearchPage } from "../src/templates/html.ts";
import { readFile } from "../src/utils/file.ts";

const app = new Hono();

// Handle GET requests to home page
app.get("/", async (c) => {
  const query = c.req.query("q");
  if (query) {
    return c.html(await generateSearchPage(query));
  }
  return c.html(await readFile("./public/index.html"));
});

export default handle(app);

