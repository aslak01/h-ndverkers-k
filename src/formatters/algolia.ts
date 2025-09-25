import type { AlgoliaResponseType } from "../../schemas.ts";

export function formatAlgoliaResults(algoliaData: AlgoliaResponseType): string {
  return (
    algoliaData.hits
      ?.map((h) => {
        const name = h._highlightResult?.name?.value || h.name || "(no name)";
        const addressParts = [h.address, h.zip_code, h.city].filter(Boolean);
        const fullAddress = addressParts.join(", ");
        const profession = h.profession_title?.[0] || "";
        const category = h.category_name?.[0] || "";
        const type =
          h.isCompany === true || h.isCompany === 1 ? "Bedrift" : "Person";
        const masterStatus = h.isMasterCompany === "Yes" ? "Mesterbedrift" : "";

        return `
      <div class="result-item">
        <dt class="result-name">${name}</dt>
        <dd class="result-details">
          ${profession ? `<div><strong>Yrke:</strong> ${profession}</div>` : ""}
          ${category ? `<div><strong>Kategori:</strong> ${category}</div>` : ""}
          ${fullAddress ? `<div><strong>Adresse:</strong> ${fullAddress}</div>` : ""}
          ${h.county_name ? `<div><strong>Fylke:</strong> ${h.county_name}</div>` : ""}
          <div class="badges">
            <span class="badge">${type}</span>
            ${masterStatus ? `<span class="badge badge-green">${masterStatus}</span>` : ""}
            ${(h.masters_count ?? 0) > 0 ? `<span class="badge badge-blue">${h.masters_count} mester${(h.masters_count ?? 0) > 1 ? "e" : ""}</span>` : ""}
          </div>
        </dd>
      </div>
    `;
      })
      .join("") || ""
  );
}
