import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      // Handle GET requests with query parameter (for linkable URLs)
      const { q: query } = req.query;

      if (query && typeof query === 'string') {
        try {
          const { generateSearchPage } = await import('../src/templates/html.js');
          const searchPageHtml = await generateSearchPage(query);
          res.setHeader('Content-Type', 'text/html');
          return res.status(200).send(searchPageHtml);
        } catch (error) {
          console.error("Error generating search page:", error);
          res.setHeader('Content-Type', 'text/html');
          return res.status(500).send(`<div class="error">Search temporarily unavailable</div>`);
        }
      }

      // If no query parameter, serve the home page
      try {
        const { readFile } = await import('../src/utils/file.js');
        const indexHtml = await readFile("./public/index.html");
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(indexHtml);
      } catch (error) {
        console.error("Error reading index file:", error);
        res.setHeader('Content-Type', 'text/html');
        return res.status(500).send(`<div class="error">Page temporarily unavailable</div>`);
      }
    }

    if (req.method === 'POST') {
      // Handle POST requests (for HTMX search results)
      const { query: rawQuery } = req.body;

      if (typeof rawQuery !== "string") {
        res.setHeader('Content-Type', 'text/html');
        return res.status(400).send(`<div class="error">Invalid query format</div>`);
      }

      try {
        const { performSearch } = await import('../src/services/search.js');
        const { formatSearchResults } = await import('../src/formatters/results.js');

        const results = await performSearch(rawQuery);
        const searchResults = formatSearchResults(results, rawQuery);
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(searchResults);
      } catch (error) {
        console.error("Search error:", error);
        res.setHeader('Content-Type', 'text/html');
        return res.status(500).send(`<div class="error">Search failed. Please try again.</div>`);
      }
    }

    // Only allow GET and POST requests
    res.setHeader('Allow', ['GET', 'POST']);
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

