import { Hono } from "hono";
import { handle } from "hono/vercel";

const app = new Hono().basePath("/api");

// Handle GET requests to home page
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

export default handle(app);

