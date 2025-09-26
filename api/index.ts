import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).send("Internal Server Error");
  }
}

