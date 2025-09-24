import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import {
  AlgoliaResponse,
  SGRegisterResponse,
  BrregResponse,
  RegnskapsregisterResponse,
  type AlgoliaResponseType,
  type SGRegisterResponseType,
  type BrregResponseType,
  type RegnskapsregisterResponseType
} from "./schemas.ts";

const ALGOLIA_APP_ID = "D9H5ZLMOB9";
const ALGOLIA_API_KEY = "fc620027c05201b6278bdda56cd73b2a";
const ALGOLIA_INDEX = "masters_and_companies_aggregator";

const app = new Hono({
});

app.use("/*", serveStatic({ root: "./public" }));

// Handle GET requests with query parameters (for linkable URLs)
app.get("/", async (c) => {
  const query = c.req.query('q');
  if (query) {
    // If there's a query parameter, serve the HTML with the search results embedded
    return c.html(await generateSearchPage(query));
  }
  // Otherwise serve the regular static file
  return c.html(await Bun.file("./public/index.html").text());
});

// Extract search logic into a reusable function
async function performSearch(query: string) {
  // Preprocess query: trim and normalize whitespace
  const processedQuery = query.trim().replace(/\s+/g, ' ');

  // Return empty results for empty query
  if (!processedQuery.trim()) {
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

  const isOrgNumberSearch = /^\d{9}$/.test(processedQuery);

  // Initial parallel API calls
  const [algoliaResp, sgRegisterResp, brregResp] = await Promise.all([
    // Algolia search
    fetch(
      `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`,
      {
        method: "POST",
        headers: {
          "X-Algolia-Application-Id": ALGOLIA_APP_ID,
          "X-Algolia-API-Key": ALGOLIA_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          params: `query=${encodeURIComponent(processedQuery)}&hitsPerPage=10`
        })
      }
    ),
    // SGREGISTER search
    fetch("https://sgregister.dibk.no/api/enterprises.json", {
      headers: {
        "Accept": "application/vnd.sgpub.v2"
      }
    }),
    // Brønnøysundsregisteret search
    fetch(`https://data.brreg.no/enhetsregisteret/api/enheter?${isOrgNumberSearch ? `organisasjonsnummer=${processedQuery}` : `navn=${encodeURIComponent(processedQuery)}&navnMetodeForSoek=FORTLOEPENDE`}&size=10`)
  ]);

  const [algoliaDataRaw, sgRegisterDataRaw, brregDataRaw] = await Promise.all([
    algoliaResp.json(),
    sgRegisterResp.json(),
    brregResp.json()
  ]);

  // Validate API responses with Zod schemas
  let algoliaData: AlgoliaResponseType;
  let sgRegisterData: SGRegisterResponseType;
  let brregData: BrregResponseType;

  try {
    algoliaData = AlgoliaResponse.parse(algoliaDataRaw);
  } catch (error) {
    console.error("Algolia API response validation failed:", error);
    algoliaData = { hits: [] };
  }

  try {
    sgRegisterData = SGRegisterResponse.parse(sgRegisterDataRaw);
  } catch (error) {
    console.error("SG-register API response validation failed:", error);
    sgRegisterData = { enterprises: [] };
  }

  try {
    brregData = BrregResponse.parse(brregDataRaw);
  } catch (error) {
    console.error("Brønnøysundsregisteret API response validation failed:", error);
    brregData = { _embedded: { enheter: [] } };
  }

  // Fetch financial data for companies found in Brønnøysundsregisteret
  const financialDataMap = new Map();
  if (brregData._embedded?.enheter && brregData._embedded.enheter.length > 0) {
    const financialPromises = brregData._embedded.enheter.map(async (enhet) => {
      try {
        const finResp = await fetch(`https://data.brreg.no/regnskapsregisteret/regnskap/${enhet.organisasjonsnummer}`);
        if (finResp.ok) {
          const finDataRaw = await finResp.json();
          try {
            const finData: RegnskapsregisterResponseType = RegnskapsregisterResponse.parse(finDataRaw);
            return { orgno: enhet.organisasjonsnummer, data: finData };
          } catch (validationError) {
            console.error(`Financial data validation failed for ${enhet.organisasjonsnummer}:`, validationError);
            return { orgno: enhet.organisasjonsnummer, data: null };
          }
        }
      } catch (e) {
        // Ignore errors for individual financial data fetches
      }
      return { orgno: enhet.organisasjonsnummer, data: null };
    });

    const financialResults = await Promise.all(financialPromises);
    financialResults.forEach(result => {
      if (result.data) {
        financialDataMap.set(result.orgno, result.data);
      }
    });
  }

  // If we searched by org number and got Brønnøysundsregisteret results,
  // do a secondary Mesterregister search by company name
  let secondaryAlgoliaData: AlgoliaResponseType | null = null;
  if (isOrgNumberSearch && brregData._embedded?.enheter && brregData._embedded.enheter.length > 0) {
    const companyName = brregData._embedded.enheter[0]?.navn;
    if (companyName) {
      try {
        const secondaryAlgoliaResp = await fetch(
          `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`,
          {
            method: "POST",
            headers: {
              "X-Algolia-Application-Id": ALGOLIA_APP_ID,
              "X-Algolia-API-Key": ALGOLIA_API_KEY,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              params: `query=${encodeURIComponent(companyName)}&hitsPerPage=10`
            })
          }
        );
        const secondaryAlgoliaDataRaw = await secondaryAlgoliaResp.json();
        secondaryAlgoliaData = AlgoliaResponse.parse(secondaryAlgoliaDataRaw);
      } catch (error) {
        console.error("Secondary Algolia API response validation failed:", error);
        secondaryAlgoliaData = null;
      }
    }
  }

  // Filter SGREGISTER results by query (search both name and organization number)
  const filteredSgResults = sgRegisterData.enterprises?.filter(enterprise => {
    const nameMatch = enterprise.name?.toLowerCase().includes(processedQuery.toLowerCase());
    const orgNumberMatch = enterprise.organizational_number?.includes(processedQuery);
    return nameMatch || orgNumberMatch;
  }).slice(0, 10) || [];

  // Format Algolia results (use secondary data if available, otherwise primary)
  const finalAlgoliaData = secondaryAlgoliaData || algoliaData;
  const algoliaHtml = finalAlgoliaData.hits?.map(h => {
    const name = h._highlightResult?.name?.value || h.name || "(no name)";
    const addressParts = [h.address, h.zip_code, h.city].filter(Boolean);
    const fullAddress = addressParts.join(", ");
    const profession = h.profession_title?.[0] || "";
    const category = h.category_name?.[0] || "";
    const type = (h.isCompany === true || h.isCompany === 1) ? "Bedrift" : "Person";
    const masterStatus = h.isMasterCompany === "Yes" ? "Mesterbedrift" : "";

    return `
      <div class="result-item">
        <dt class="result-name">${name}</dt>
        <dd class="result-details">
          ${profession ? `<div><strong>Yrke:</strong> ${profession}</div>` : ''}
          ${category ? `<div><strong>Kategori:</strong> ${category}</div>` : ''}
          ${fullAddress ? `<div><strong>Adresse:</strong> ${fullAddress}</div>` : ''}
          ${h.county_name ? `<div><strong>Fylke:</strong> ${h.county_name}</div>` : ''}
          <div class="badges">
            <span class="badge">${type}</span>
            ${masterStatus ? `<span class="badge badge-green">${masterStatus}</span>` : ''}
            ${(h.masters_count ?? 0) > 0 ? `<span class="badge badge-blue">${h.masters_count} mester${(h.masters_count ?? 0) > 1 ? 'e' : ''}</span>` : ''}
          </div>
        </dd>
      </div>
    `;
  }).join("") || "";

  // Format SGREGISTER results
  const sgRegisterHtml = filteredSgResults.map(enterprise => {
    const businessAddress = enterprise.businessaddress;
    const addressParts = [
      businessAddress?.line_1,
      businessAddress?.postal_code,
      businessAddress?.postal_town
    ].filter(Boolean);
    const fullAddress = addressParts.join(", ");

    const approvalAreas = enterprise.valid_approval_areas?.map(area => area?.subject_area).filter(Boolean).join(", ") || "";
    const isApproved = enterprise.status?.approved ? "Godkjent" : "Ikke godkjent";

    return `
      <div class="result-item">
        <dt class="result-name">${enterprise.name}</dt>
        <dd class="result-details">
          <div><strong>Org.nr:</strong> ${enterprise.organizational_number}</div>
          ${approvalAreas ? `<div><strong>Godkjenningsområder:</strong> ${approvalAreas}</div>` : ''}
          ${fullAddress ? `<div><strong>Adresse:</strong> ${fullAddress}</div>` : ''}
          <div class="badges">
            <span class="badge">SG-register</span>
            <span class="badge ${enterprise.status?.approved ? 'badge-green' : 'badge-gray'}">${isApproved}</span>
          </div>
        </dd>
      </div>
    `;
  }).join("");

  // Format Brønnøysundsregisteret results
  const brregHtml = brregData._embedded?.enheter?.map(enhet => {
    const address = enhet.forretningsadresse || enhet.postadresse;
    const addressParts = [
      address?.adresse?.[0],
      address?.postnummer,
      address?.poststed
    ].filter(Boolean);
    const fullAddress = addressParts.join(", ");

    const isActive = enhet.konkurs !== true && enhet.underAvvikling !== true && enhet.underTvangsavviklingEllerTvangsopplosning !== true;
    const status = isActive ? "Aktiv" : "Inaktiv";

    // Get financial data for this company
    const financialData = financialDataMap.get(enhet.organisasjonsnummer);
    const latestFinancials = financialData && financialData.length > 0 ? financialData[0] : null;

    // Format financial figures
    const formatAmount = (amount: string | number | null | undefined) => {
      if (amount === null || amount === undefined) return "N/A";
      const million = Number(amount) / 1000000;
      return `${million.toFixed(1)}M NOK`;
    };

    let financialTable = '';
    if (latestFinancials) {
      const revenue = latestFinancials.resultatregnskapResultat?.driftsresultat?.driftsinntekter?.sumDriftsinntekter;
      const profit = latestFinancials.resultatregnskapResultat?.aarsresultat;
      const assets = latestFinancials.eiendeler?.sumEiendeler;

      const rows = [];
      if (revenue) rows.push(`<tr><td>Omsetning:</td><td>${formatAmount(revenue)}</td></tr>`);
      if (profit !== null && profit !== undefined) rows.push(`<tr><td>Årsresultat:</td><td>${formatAmount(profit)}</td></tr>`);
      if (assets) rows.push(`<tr><td>Sum eiendeler:</td><td>${formatAmount(assets)}</td></tr>`);

      if (rows.length > 0) {
        financialTable = `<table class="financial-table">${rows.join('')}</table>`;
      }
    }

    return `
      <div class="result-item">
        <dt class="result-name">${enhet.navn}</dt>
        <dd class="result-details">
          <div><strong>Org.nr:</strong> ${enhet.organisasjonsnummer}</div>
          ${enhet.organisasjonsform?.beskrivelse ? `<div><strong>Organisasjonsform:</strong> ${enhet.organisasjonsform.beskrivelse}</div>` : ''}
          ${enhet.naeringskode1?.beskrivelse ? `<div><strong>Næringskode:</strong> ${enhet.naeringskode1.beskrivelse}</div>` : ''}
          ${fullAddress ? `<div><strong>Adresse:</strong> ${fullAddress}</div>` : ''}
          ${enhet.antallAnsatte ? `<div><strong>Antall ansatte:</strong> ${enhet.antallAnsatte}</div>` : ''}
          ${enhet.sisteInnsendteAarsregnskap ? `<div><strong>Siste årsregnskap:</strong> ${enhet.sisteInnsendteAarsregnskap}</div>` : ''}
          ${financialTable}
          <div><strong>Lenker:</strong> <a href="https://w2.brreg.no/enhet/sok/detalj.jsp?orgnr=${enhet.organisasjonsnummer}" target="_blank" rel="noopener">Bedriftsinformasjon</a></div>
          <div class="badges">
            <span class="badge">Brønnøysundsregisteret</span>
            <span class="badge ${isActive ? 'badge-green' : 'badge-gray'}">${status}</span>
          </div>
        </dd>
      </div>
    `;
  }).join("") || "";

  return `
    <div class="results-container">
      <div class="results-column">
        <h3>Mesterregister</h3>
        ${algoliaHtml || `<div>Ingen resultater funnet for "${processedQuery}"</div>`}
      </div>
      <div class="results-column">
        <h3>SG-register (DIBK)</h3>
        ${sgRegisterHtml || `<div>Ingen resultater funnet for "${processedQuery}"</div>`}
      </div>
      <div class="results-column">
        <h3>Brønnøysundsregisteret</h3>
        ${brregHtml || `<div>Ingen resultater funnet for "${processedQuery}"</div>`}
      </div>
    </div>
  `;
}

// Generate complete HTML page with search results
async function generateSearchPage(query: string) {
  const baseHtml = await Bun.file("./public/index.html").text();
  const searchResults = await performSearch(query);

  // Inject the search results and set the input value
  const htmlWithResults = baseHtml
    .replace('<div id="results"></div>', `<div id="results">${searchResults}</div>`)
    .replace('id="query"', `id="query" value="${query.replace(/"/g, '&quot;')}"`);

  return htmlWithResults;
}

// Handle GET requests to /search with query parameter (for linkable URLs)
app.get("/search", async (c) => {
  const query = c.req.query('q');
  if (query) {
    // Return the full page with search results embedded
    return c.html(await generateSearchPage(query));
  }
  // If no query parameter, serve the home page HTML directly
  return c.html(await Bun.file("./public/index.html").text());
});

app.post("/search", async (c) => {
  const { query: rawQuery } = await c.req.json();

  if (typeof rawQuery !== "string") {
    return c.html(`<div class="error">Invalid query format</div>`);
  }

  const searchResults = await performSearch(rawQuery);
  return c.html(searchResults);
});

serve({
  fetch: app.fetch,
  port: 8787,
}, (info) => {
  console.log(`🚀 Server running at http://localhost:${info.port}`);
});
