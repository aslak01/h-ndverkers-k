import { API_ENDPOINTS } from "../config/constants.ts";
import {
  SGRegisterResponse,
  type SGRegisterResponseType,
} from "../../schemas.ts";

export async function searchSGRegister(): Promise<SGRegisterResponseType> {
  try {
    const response = await fetch(API_ENDPOINTS.SGREGISTER, {
      headers: {
        Accept: "application/vnd.sgpub.v2",
      },
    });

    const data = await response.json();
    return SGRegisterResponse.parse(data);
  } catch (error) {
    console.error("SG-register API response validation failed:", error);
    return { enterprises: [] };
  }
}

export function filterSGRegisterResults(
  data: SGRegisterResponseType,
  query: string,
) {
  return (
    data.enterprises
      ?.filter((enterprise) => {
        const nameMatch = enterprise.name
          ?.toLowerCase()
          .includes(query.toLowerCase());
        const orgNumberMatch =
          enterprise.organizational_number?.includes(query);
        return nameMatch || orgNumberMatch;
      })
      .slice(0, 10) || []
  );
}

export type FilteredSGRegisterResultType = ReturnType<
  typeof filterSGRegisterResults
>;
