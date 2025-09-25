import { formatAlgoliaResults } from "./algolia.ts";
import { formatSGRegisterResults } from "./sgregister.ts";
import { formatBrregResults } from "./brreg.ts";
import type { SearchResults } from "../services/search.ts";

export function formatSearchResults(
  results: SearchResults,
  query: string,
): string {
  const { algoliaData, sgRegisterData, brregData, financialDataMap } = results;

  // Return empty results for empty query
  if (!query.trim()) {
    return `
      <div class="results-container">
        <div class="results-column">
          <h3>Mesterregister</h3>
          <div>Skriv inn søkeord for å finne resultater</div>
        </div>
        <div class="results-column">
          <h3>SG-register (DIBK)</h3>
          <div>Skriv inn søkeord for å finne resultater</div>
        </div>
        <div class="results-column">
          <h3>Brønnøysundsregisteret</h3>
          <div>Skriv inn søkeord for å finne resultater</div>
        </div>
      </div>
    `;
  }

  const algoliaHtml = formatAlgoliaResults(algoliaData);
  const sgRegisterHtml = formatSGRegisterResults(sgRegisterData);
  const brregHtml = formatBrregResults(brregData, financialDataMap);

  return `
    <div class="results-container">
      <div class="results-column">
        <h3>Mesterregister</h3>
        ${algoliaHtml || `<div>Ingen resultater funnet for "${query}"</div>`}
      </div>
      <div class="results-column">
        <h3>SG-register (DIBK)</h3>
        ${sgRegisterHtml || `<div>Ingen resultater funnet for "${query}"</div>`}
      </div>
      <div class="results-column">
        <h3>Brønnøysundsregisteret</h3>
        ${brregHtml || `<div>Ingen resultater funnet for "${query}"</div>`}
      </div>
    </div>
  `;
}

