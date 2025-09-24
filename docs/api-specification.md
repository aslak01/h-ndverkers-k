# API Specification - Håndverkersøk

This document describes all external APIs used by the Håndverkersøk application for searching Norwegian construction companies and craftspeople.

## Overview

The application integrates with four main data sources:
1. **Algolia** - Mesterregister (Master Register) search
2. **SG-register (DIBK)** - Professional qualifications database
3. **Brønnøysundsregisteret** - Central Coordinating Register for Legal Entities
4. **Regnskapsregisteret** - Register of Company Accounts (financial data)

## 1. Algolia API (Mesterregister)

### Purpose
Search for certified craftspeople and master companies in Norwegian building trades.

### Endpoint
```
POST https://D9H5ZLMOB9-dsn.algolia.net/1/indexes/masters_and_companies_aggregator/query
```

### Authentication
```
X-Algolia-Application-Id: D9H5ZLMOB9
X-Algolia-API-Key: fc620027c05201b6278bdda56cd73b2a
Content-Type: application/json
```

### Request Body
```json
{
  "params": "query=<search_term>&hitsPerPage=10"
}
```

### Response Format
```json
{
  "hits": [
    {
      "name": "Company Name",
      "_highlightResult": {
        "name": {
          "value": "Highlighted <mark>Name</mark>"
        }
      },
      "address": "Street Address",
      "zip_code": "1234",
      "city": "City Name",
      "county_name": "County",
      "profession_title": ["Profession"],
      "category_name": ["Category"],
      "isCompany": true,
      "isMasterCompany": "Yes",
      "masters_count": 1
    }
  ]
}
```

### Key Fields
- `name`: Company/person name
- `address`, `zip_code`, `city`: Location information
- `profession_title`: Professional qualifications
- `category_name`: Business category
- `isCompany`: Boolean indicating if it's a company
- `isMasterCompany`: "Yes" if certified master company
- `masters_count`: Number of certified masters

---

## 2. SG-register API (DIBK)

### Purpose
Professional qualifications and approvals from the Norwegian Building Authority.

### Endpoint
```
GET https://sgregister.dibk.no/api/enterprises.json
```

### Authentication
```
Accept: application/vnd.sgpub.v2
```

### Parameters
None required - returns all enterprises, filtered client-side.

### Response Format
```json
{
  "enterprises": [
    {
      "name": "Enterprise Name",
      "organizational_number": "123456789",
      "businessaddress": {
        "line_1": "Street Address",
        "postal_code": "1234",
        "postal_town": "City"
      },
      "valid_approval_areas": [
        {
          "subject_area": "Construction area description"
        }
      ],
      "status": {
        "approved": true
      }
    }
  ]
}
```

### Key Fields
- `name`: Enterprise name
- `organizational_number`: 9-digit organization number
- `businessaddress`: Business address details
- `valid_approval_areas`: Approved construction areas
- `status.approved`: Approval status

### Client-side Filtering
Results are filtered by:
- Company name (case-insensitive substring match)
- Organization number (exact match)

---

## 3. Brønnøysundsregisteret API

### Purpose
Official Norwegian business registry with comprehensive company information.

### Endpoint
```
GET https://data.brreg.no/enhetsregisteret/api/enheter
```

### Parameters
- `organisasjonsnummer=<9-digit-number>` - Search by organization number
- `navn=<company-name>&navnMetodeForSoek=FORTLOEPENDE` - Search by name
- `size=10` - Limit results

### Response Format
```json
{
  "_embedded": {
    "enheter": [
      {
        "organisasjonsnummer": "123456789",
        "navn": "Company Name",
        "organisasjonsform": {
          "beskrivelse": "Aksjeselskap"
        },
        "forretningsadresse": {
          "adresse": ["Street Address"],
          "postnummer": "1234",
          "poststed": "City"
        },
        "postadresse": {
          "adresse": ["PO Box"],
          "postnummer": "1234",
          "poststed": "City"
        },
        "naeringskode1": {
          "beskrivelse": "Industry description"
        },
        "antallAnsatte": 50,
        "sisteInnsendteAarsregnskap": "2024",
        "konkurs": false,
        "underAvvikling": false,
        "underTvangsavviklingEllerTvangsopplosning": false
      }
    ]
  }
}
```

### Key Fields
- `organisasjonsnummer`: 9-digit organization number
- `navn`: Company name
- `organisasjonsform.beskrivelse`: Legal form (AS, ASA, etc.)
- `forretningsadresse`: Business address
- `postadresse`: Postal address (fallback)
- `naeringskode1.beskrivelse`: Primary industry code description
- `antallAnsatte`: Number of employees
- `sisteInnsendteAarsregnskap`: Year of latest annual report
- `konkurs`, `underAvvikling`, `underTvangsavviklingEllerTvangsopplosning`: Status flags

---

## 4. Regnskapsregisteret API

### Purpose
Financial data and annual account information for Norwegian companies.

### Endpoint
```
GET https://data.brreg.no/regnskapsregisteret/regnskap/<organisasjonsnummer>
```

### Parameters
- `<organisasjonsnummer>`: 9-digit organization number

### Response Format
```json
[
  {
    "regnskapsperiode": {
      "fraDato": "2024-01-01",
      "tilDato": "2024-12-31"
    },
    "resultatregnskapResultat": {
      "driftsresultat": {
        "driftsinntekter": {
          "sumDriftsinntekter": 14034000000.00
        }
      },
      "aarsresultat": -208000000.00
    },
    "eiendeler": {
      "sumEiendeler": 22302000000.00
    }
  }
]
```

### Key Fields
- `regnskapsperiode`: Accounting period dates
- `resultatregnskapResultat.driftsresultat.driftsinntekter.sumDriftsinntekter`: Total revenue
- `resultatregnskapResultat.aarsresultat`: Annual profit/loss
- `eiendeler.sumEiendeler`: Total assets

### Data Processing
- Amounts are in NOK (Norwegian Kroner)
- Values are converted to millions for display (divided by 1,000,000)
- Formatted as "X.XM NOK" (e.g., "14034.0M NOK")

---

## Search Logic

### Query Preprocessing
1. Trim leading/trailing whitespace
2. Collapse multiple spaces to single spaces
3. Detect organization number pattern (`/^\d{9}$/`)

### Search Strategy
1. **Organization Number Search** (9 digits):
   - Algolia: Search by organization number
   - SG-register: Filter by organization number
   - Brønnøysundsregisteret: Direct lookup by organization number
   - **Secondary lookup**: If Brønnøysundsregisteret returns results, perform additional Algolia search using company name

2. **Name Search** (text):
   - Algolia: Full-text search
   - SG-register: Filter by company name (substring match)
   - Brønnøysundsregisteret: Name search with `navnMetodeForSoek=FORTLOEPENDE`

### Parallel Processing
- All main API calls are executed in parallel for performance
- Financial data is fetched in parallel for all companies found in Brønnøysundsregisteret
- Secondary Algolia lookup (for organization number searches) is performed after initial results

### Error Handling
- Individual API failures are caught and ignored
- Partial results are displayed even if some APIs fail
- Empty results show appropriate "no results found" messages

---

## Rate Limits and Performance

### Considerations
- **Algolia**: Commercial search service, should have reasonable rate limits
- **SG-register**: Government API, returns full dataset for client-side filtering
- **Brønnøysundsregisteret**: Open data API, should handle reasonable request volumes
- **Regnskapsregisteret**: Open data API, may have rate limits

### Optimization
- Parallel API calls minimize total response time
- Financial data is only fetched for companies that appear in Brønnøysundsregisteret results
- Client-side filtering for SG-register reduces API calls
- Results are limited to 10 items per data source

---

## External Links

### Company Information
- **Format**: `https://w2.brreg.no/enhet/sok/detalj.jsp?orgnr=<organisasjonsnummer>`
- **Purpose**: Official company information page at Brønnøysund Register Centre

### API Documentation
- [Brønnøysundsregisteret API](https://data.brreg.no/enhetsregisteret/api/dokumentasjon/no/index.html)
- [Regnskapsregisteret API](https://data.brreg.no/regnskapsregisteret/regnskap/swagger-ui/swagger-ui/index.html)
- [SG-register API](https://sgregister.dibk.no/api/enterprises.json)