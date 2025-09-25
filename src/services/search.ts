import { searchAlgolia } from "./algolia.ts";
import {
  searchSGRegister,
  filterSGRegisterResults,
  FilteredSGRegisterResultType,
} from "./sgregister.ts";
import { searchBrreg, getFinancialDataForCompanies } from "./brreg.ts";
import type {
  AlgoliaResponseType,
  BrregResponseType,
  RegnskapsregisterResponseType,
} from "../../schemas.ts";

export interface SearchResults {
  algoliaData: AlgoliaResponseType;
  sgRegisterData: FilteredSGRegisterResultType;
  brregData: BrregResponseType;
  financialDataMap: Map<string, RegnskapsregisterResponseType>;
}

export async function performSearch(query: string): Promise<SearchResults> {
  // Preprocess query: trim and normalize whitespace
  const processedQuery = query.trim().replace(/\s+/g, " ");
  const isOrgNumberSearch = /^\d{9}$/.test(processedQuery);

  // Initial parallel API calls
  const [algoliaData, sgRegisterData, brregData] = await Promise.all([
    searchAlgolia(processedQuery),
    searchSGRegister(),
    searchBrreg(processedQuery),
  ]);

  // Filter SG register results
  const filteredSgResults = filterSGRegisterResults(
    sgRegisterData,
    processedQuery,
  );

  // Get financial data for Brønnøysundsregisteret companies
  const financialDataMap = await getFinancialDataForCompanies(brregData);

  // If we searched by org number and got Brønnøysundsregisteret results,
  // do a secondary Mesterregister search by company name
  let finalAlgoliaData = algoliaData;
  if (
    isOrgNumberSearch &&
    brregData._embedded?.enheter &&
    brregData._embedded.enheter.length > 0
  ) {
    const companyName = brregData._embedded.enheter[0]?.navn;
    if (companyName) {
      try {
        const secondaryAlgoliaData = await searchAlgolia(companyName);
        finalAlgoliaData = secondaryAlgoliaData;
      } catch (error) {
        console.error("Secondary Algolia search failed:", error);
      }
    }
  }

  return {
    algoliaData: finalAlgoliaData,
    sgRegisterData: filteredSgResults,
    brregData,
    financialDataMap,
  };
}
