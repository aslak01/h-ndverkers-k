import { readFile } from "../utils/file.ts";
import { performSearch } from "../services/search.ts";
import { formatSearchResults } from "../formatters/results.ts";

export async function generateSearchPage(query: string): Promise<string> {
  const baseHtml = await readFile("./public/index.html");
  const results = await performSearch(query);
  const searchResults = formatSearchResults(results, query);

  // Inject the search results and set the input value
  const htmlWithResults = baseHtml
    .replace(
      '<div id="results"></div>',
      `<div id="results">${searchResults}</div>`,
    )
    .replace(
      'id="query"',
      `id="query" value="${query.replace(/"/g, "&quot;")}"`,
    );

  return htmlWithResults;
}

