import type {
  BrregResponseType,
  RegnskapsregisterResponseType,
} from "../../schemas.ts";

function formatAmount(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return "N/A";
  const million = Number(amount) / 1000000;
  return `${million.toFixed(1)}M NOK`;
}

export function formatBrregResults(
  brregData: BrregResponseType,
  financialDataMap: Map<string, RegnskapsregisterResponseType>,
): string {
  return (
    brregData._embedded?.enheter
      ?.map((enhet) => {
        const address = enhet.forretningsadresse || enhet.postadresse;
        const addressParts = [
          address?.adresse?.[0],
          address?.postnummer,
          address?.poststed,
        ].filter(Boolean);
        const fullAddress = addressParts.join(", ");

        const isActive =
          enhet.konkurs !== true &&
          enhet.underAvvikling !== true &&
          enhet.underTvangsavviklingEllerTvangsopplosning !== true;
        const status = isActive ? "Aktiv" : "Inaktiv";

        // Get financial data for this company
        const financialData = financialDataMap.get(
          enhet.organisasjonsnummer || "",
        );
        const latestFinancials =
          financialData && financialData.length > 0 ? financialData[0] : null;

        let financialTable = "";
        if (latestFinancials) {
          const revenue =
            latestFinancials.resultatregnskapResultat?.driftsresultat
              ?.driftsinntekter?.sumDriftsinntekter;
          const profit =
            latestFinancials.resultatregnskapResultat?.aarsresultat;
          const assets = latestFinancials.eiendeler?.sumEiendeler;

          const rows = [];
          if (revenue)
            rows.push(
              `<tr><td>Omsetning:</td><td>${formatAmount(revenue)}</td></tr>`,
            );
          if (profit !== null && profit !== undefined)
            rows.push(
              `<tr><td>Årsresultat:</td><td>${formatAmount(profit)}</td></tr>`,
            );
          if (assets)
            rows.push(
              `<tr><td>Sum eiendeler:</td><td>${formatAmount(assets)}</td></tr>`,
            );

          if (rows.length > 0) {
            financialTable = `<table class="financial-table">${rows.join("")}</table>`;
          }
        }

        return `
      <div class="result-item">
        <dt class="result-name">${enhet.navn}</dt>
        <dd class="result-details">
          <div><strong>Org.nr:</strong> ${enhet.organisasjonsnummer}</div>
          ${enhet.organisasjonsform?.beskrivelse ? `<div><strong>Organisasjonsform:</strong> ${enhet.organisasjonsform.beskrivelse}</div>` : ""}
          ${enhet.naeringskode1?.beskrivelse ? `<div><strong>Næringskode:</strong> ${enhet.naeringskode1.beskrivelse}</div>` : ""}
          ${fullAddress ? `<div><strong>Adresse:</strong> ${fullAddress}</div>` : ""}
          ${enhet.antallAnsatte ? `<div><strong>Antall ansatte:</strong> ${enhet.antallAnsatte}</div>` : ""}
          ${enhet.sisteInnsendteAarsregnskap ? `<div><strong>Siste årsregnskap:</strong> ${enhet.sisteInnsendteAarsregnskap}</div>` : ""}
          ${financialTable}
          <div><strong>Lenker:</strong> <a href="https://w2.brreg.no/enhet/sok/detalj.jsp?orgnr=${enhet.organisasjonsnummer}" target="_blank" rel="noopener">Bedriftsinformasjon</a></div>
          <div class="badges">
            <span class="badge">Brønnøysundsregisteret</span>
            <span class="badge ${isActive ? "badge-green" : "badge-gray"}">${status}</span>
          </div>
        </dd>
      </div>
    `;
      })
      .join("") || ""
  );
}

