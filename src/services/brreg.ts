import { API_ENDPOINTS } from "../config/constants.ts";
import {
  BrregResponse,
  RegnskapsregisterResponse,
  type BrregResponseType,
  type RegnskapsregisterResponseType,
} from "../../schemas.ts";

export async function searchBrreg(query: string): Promise<BrregResponseType> {
  const isOrgNumberSearch = /^\d{9}$/.test(query);
  const url = `${API_ENDPOINTS.BRREG_ENHETER}?${
    isOrgNumberSearch
      ? `organisasjonsnummer=${query}`
      : `navn=${encodeURIComponent(query)}&navnMetodeForSoek=FORTLOEPENDE`
  }&size=10`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return BrregResponse.parse(data);
  } catch (error) {
    console.error(
      "Brønnøysundsregisteret API response validation failed:",
      error,
    );
    return { _embedded: { enheter: [] } };
  }
}

export async function getFinancialData(
  organisasjonsnummer: string,
): Promise<RegnskapsregisterResponseType | null> {
  try {
    const response = await fetch(
      `${API_ENDPOINTS.REGNSKAPSREGISTER}/${organisasjonsnummer}`,
    );
    if (!response.ok) return null;

    const data = await response.json();
    return RegnskapsregisterResponse.parse(data);
  } catch (error) {
    console.error(
      `Financial data validation failed for ${organisasjonsnummer}:`,
      error,
    );
    return null;
  }
}

export async function getFinancialDataForCompanies(
  companies: BrregResponseType,
): Promise<Map<string, RegnskapsregisterResponseType>> {
  const financialDataMap = new Map();

  if (
    !companies._embedded?.enheter ||
    companies._embedded.enheter.length === 0
  ) {
    return financialDataMap;
  }

  const financialPromises = companies._embedded.enheter.map(async (enhet) => {
    if (!enhet.organisasjonsnummer) return null;

    const data = await getFinancialData(enhet.organisasjonsnummer);
    return { orgno: enhet.organisasjonsnummer, data };
  });

  const financialResults = await Promise.all(financialPromises);

  financialResults.forEach((result) => {
    if (result?.data && result.orgno) {
      financialDataMap.set(result.orgno, result.data);
    }
  });

  return financialDataMap;
}
