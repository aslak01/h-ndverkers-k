import { Hono } from "hono";
import { handle } from "hono/vercel";
import { performSearch } from "../src/services/search.ts";
import { formatSearchResults } from "../src/formatters/results.ts";
import { generateSearchPage } from "../src/templates/html.ts";
import { readFile } from "../src/utils/file.ts";

const app = new Hono();

// Handle GET requests with query parameters (for linkable URLs)
app.get("/", async (c) => {
  const query = c.req.query("q");
  if (query) {
    return c.html(await generateSearchPage(query));
  }
  return c.html(await readFile("./public/index.html"));
});

// Handle POST requests to /search
app.post("/", async (c) => {
  const { query: rawQuery } = await c.req.json();

  if (typeof rawQuery !== "string") {
    return c.html(`<div class="error">Invalid query format</div>`);
  }

  const results = await performSearch(rawQuery);
  const searchResults = formatSearchResults(results, rawQuery);
  return c.html(searchResults);
});

export default handle(app);

