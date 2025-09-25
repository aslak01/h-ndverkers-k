export const ALGOLIA_CONFIG = {
  APP_ID: "D9H5ZLMOB9",
  API_KEY: "fc620027c05201b6278bdda56cd73b2a",
  INDEX: "masters_and_companies_aggregator",
} as const;

export const API_ENDPOINTS = {
  SGREGISTER: "https://sgregister.dibk.no/api/enterprises.json",
  BRREG_ENHETER: "https://data.brreg.no/enhetsregisteret/api/enheter",
  REGNSKAPSREGISTER: "https://data.brreg.no/regnskapsregisteret/regnskap",
} as const;

export const SERVER_CONFIG = {
  PORT: 8787,
} as const;
