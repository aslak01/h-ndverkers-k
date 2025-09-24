import { z } from "zod";

// Algolia API Response Schema
export const AlgoliaHighlightResult = z.object({
  name: z.object({
    value: z.string().nullable(),
  }).optional(),
}).optional();

export const AlgoliaHit = z.object({
  name: z.string().nullable().optional(),
  _highlightResult: AlgoliaHighlightResult,
  address: z.string().nullable().optional(),
  zip_code: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  county_name: z.string().nullable().optional(),
  profession_title: z.array(z.string().nullable()).nullable().optional(),
  category_name: z.array(z.string().nullable()).nullable().optional(),
  isCompany: z.union([z.boolean(), z.number()]).nullable().optional(),
  isMasterCompany: z.string().nullable().optional(),
  masters_count: z.number().nullable().optional(),
});

export const AlgoliaResponse = z.object({
  hits: z.array(AlgoliaHit),
});

export const SGRegisterBusinessAddress = z.object({
  line_1: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  postal_town: z.string().nullable().optional(),
}).nullable().optional();

export const SGRegisterApprovalArea = z.object({
  subject_area: z.string().nullable().optional(),
}).nullable();

export const SGRegisterStatus = z.object({
  approved: z.boolean().nullable().optional(),
}).nullable().optional();

export const SGRegisterEnterprise = z.object({
  name: z.string().nullable().optional(),
  organizational_number: z.string().nullable().optional(),
  businessaddress: SGRegisterBusinessAddress,
  valid_approval_areas: z.array(SGRegisterApprovalArea).nullable().optional(),
  status: SGRegisterStatus,
});

export const SGRegisterResponse = z.object({
  enterprises: z.array(SGRegisterEnterprise),
});

// Brønnøysundsregisteret API Response Schema
export const BrregOrganisasjonsform = z.object({
  beskrivelse: z.string().nullable().optional(),
}).nullable().optional();

export const BrregAddress = z.object({
  adresse: z.array(z.string().nullable()).nullable().optional(),
  postnummer: z.string().nullable().optional(),
  poststed: z.string().nullable().optional(),
}).nullable().optional();

export const BrregNaeringskode = z.object({
  beskrivelse: z.string().nullable().optional(),
}).nullable().optional();

export const BrregEnhet = z.object({
  organisasjonsnummer: z.string().nullable().optional(),
  navn: z.string().nullable().optional(),
  organisasjonsform: BrregOrganisasjonsform,
  forretningsadresse: BrregAddress,
  postadresse: BrregAddress,
  naeringskode1: BrregNaeringskode,
  antallAnsatte: z.number().nullable().optional(),
  sisteInnsendteAarsregnskap: z.string().nullable().optional(),
  konkurs: z.boolean().nullable().optional(),
  underAvvikling: z.boolean().nullable().optional(),
  underTvangsavviklingEllerTvangsopplosning: z.boolean().nullable().optional(),
});

export const BrregResponse = z.object({
  _embedded: z.object({
    enheter: z.array(BrregEnhet).nullable().optional(),
  }).nullable().optional(),
});

// Regnskapsregisteret API Response Schema
export const RegnskapsperiodeSchema = z.object({
  fraDato: z.string().nullable().optional(),
  tilDato: z.string().nullable().optional(),
}).nullable().optional();

export const DriftsinntekterSchema = z.object({
  sumDriftsinntekter: z.number().nullable().optional(),
}).nullable().optional();

export const DriftsresultatSchema = z.object({
  driftsinntekter: DriftsinntekterSchema,
}).nullable().optional();

export const ResultatregnskapResultatSchema = z.object({
  driftsresultat: DriftsresultatSchema,
  aarsresultat: z.number().nullable().optional(),
}).nullable().optional();

export const EiendelerSchema = z.object({
  sumEiendeler: z.number().nullable().optional(),
}).nullable().optional();

export const RegnskapsregisterEntry = z.object({
  regnskapsperiode: RegnskapsperiodeSchema,
  resultatregnskapResultat: ResultatregnskapResultatSchema,
  eiendeler: EiendelerSchema,
});

export const RegnskapsregisterResponse = z.array(RegnskapsregisterEntry);

export type AlgoliaResponseType = z.infer<typeof AlgoliaResponse>;
export type SGRegisterResponseType = z.infer<typeof SGRegisterResponse>;
export type BrregResponseType = z.infer<typeof BrregResponse>;
export type RegnskapsregisterResponseType = z.infer<typeof RegnskapsregisterResponse>;
