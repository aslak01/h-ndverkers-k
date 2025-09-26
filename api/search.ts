import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') {
      const { query: rawQuery } = req.body;

      if (typeof rawQuery !== "string") {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: "Invalid query format" });
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
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: "Search failed. Please try again." });
      }
    }

    // Only allow POST requests for search
    res.setHeader('Allow', ['POST']);
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

