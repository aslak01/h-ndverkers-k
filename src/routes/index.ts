import { Hono } from "hono";
import { readFile } from "../utils/file.ts";
import { generateSearchPage } from "../templates/html.ts";
import { performSearch } from "../services/search.ts";
import { formatSearchResults } from "../formatters/results.ts";

export function createRoutes(): Hono {
  const app = new Hono();

  // Handle GET requests with query parameters (for linkable URLs)
  app.get("/", async (c) => {
    const query = c.req.query("q");
    if (query) {
      // If there's a query parameter, serve the HTML with the search results embedded
      return c.html(await generateSearchPage(query));
    }
    // Otherwise serve the regular static file
    return c.html(await readFile("./public/index.html"));
  });

  // Handle GET requests to /search with query parameter (for linkable URLs)
  app.get("/search", async (c) => {
    const query = c.req.query("q");
    if (query) {
      // Return the full page with search results embedded
      return c.html(await generateSearchPage(query));
    }
    // If no query parameter, serve the home page HTML directly
    return c.html(await readFile("./public/index.html"));
  });

  // Handle POST requests to /search
  app.post("/search", async (c) => {
    const { query: rawQuery } = await c.req.json();

    if (typeof rawQuery !== "string") {
      return c.html(`<div class="error">Invalid query format</div>`);
    }

    const results = await performSearch(rawQuery);
    const searchResults = formatSearchResults(results, rawQuery);
    return c.html(searchResults);
  });

  return app;
}

