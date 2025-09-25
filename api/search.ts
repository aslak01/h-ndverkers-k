import { Hono } from "hono";
import { handle } from "hono/vercel";

const app = new Hono();

// Handle GET requests with query parameters (for linkable URLs)
app.get("/", async (c) => {
  const query = c.req.query("q");
  if (query) {
    try {
      const { generateSearchPage } = await import("../src/templates/html.ts");
      return c.html(await generateSearchPage(query));
    } catch (error) {
      console.error("Error generating search page:", error);
      return c.html(`<div class="error">Search temporarily unavailable</div>`);
    }
  }

  try {
    const { readFile } = await import("../src/utils/file.ts");
    return c.html(await readFile("./public/index.html"));
  } catch (error) {
    console.error("Error reading index file:", error);
    return c.html(`<div class="error">Page temporarily unavailable</div>`);
  }
});

// Handle POST requests to /search
app.post("/", async (c) => {
  try {
    const { query: rawQuery } = await c.req.json();

    if (typeof rawQuery !== "string") {
      return c.html(`<div class="error">Invalid query format</div>`);
    }

    const { performSearch } = await import("../src/services/search.ts");
    const { formatSearchResults } = await import("../src/formatters/results.ts");

    const results = await performSearch(rawQuery);
    const searchResults = formatSearchResults(results, rawQuery);
    return c.html(searchResults);
  } catch (error) {
    console.error("Search error:", error);
    return c.html(`<div class="error">Search failed. Please try again.</div>`);
  }
});

export default handle(app);

