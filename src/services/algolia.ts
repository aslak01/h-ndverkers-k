import { ALGOLIA_CONFIG } from "../config/constants.ts";
import { AlgoliaResponse, type AlgoliaResponseType } from "../../schemas.ts";

export async function searchAlgolia(
  query: string,
): Promise<AlgoliaResponseType> {
  try {
    const response = await fetch(
      `https://${ALGOLIA_CONFIG.APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_CONFIG.INDEX}/query`,
      {
        method: "POST",
        headers: {
          "X-Algolia-Application-Id": ALGOLIA_CONFIG.APP_ID,
          "X-Algolia-API-Key": ALGOLIA_CONFIG.API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          params: `query=${encodeURIComponent(query)}&hitsPerPage=10`,
        }),
      },
    );

    const data = await response.json();
    return AlgoliaResponse.parse(data);
  } catch (error) {
    console.error("Algolia API response validation failed:", error);
    return { hits: [] };
  }
}
