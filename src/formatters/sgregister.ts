import type { SGRegisterEnterpriseType } from "../../schemas.ts";

export function formatSGRegisterResults(
  enterprises: SGRegisterEnterpriseType[],
): string {
  return enterprises
    .map((enterprise) => {
      const businessAddress = enterprise.businessaddress;
      const addressParts = [
        businessAddress?.line_1,
        businessAddress?.postal_code,
        businessAddress?.postal_town,
      ].filter(Boolean);
      const fullAddress = addressParts.join(", ");

      const approvalAreas =
        enterprise.valid_approval_areas
          ?.map((area: any) => area?.subject_area)
          .filter(Boolean)
          .join(", ") || "";
      const isApproved = enterprise.status?.approved
        ? "Godkjent"
        : "Ikke godkjent";

      return `
      <div class="result-item">
        <dt class="result-name">${enterprise.name}</dt>
        <dd class="result-details">
          <div><strong>Org.nr:</strong> ${enterprise.organizational_number}</div>
          ${approvalAreas ? `<div><strong>Godkjenningsområder:</strong> ${approvalAreas}</div>` : ""}
          ${fullAddress ? `<div><strong>Adresse:</strong> ${fullAddress}</div>` : ""}
          <div class="badges">
            <span class="badge">SG-register</span>
            <span class="badge ${enterprise.status?.approved ? "badge-green" : "badge-gray"}">${isApproved}</span>
          </div>
        </dd>
      </div>
    `;
    })
    .join("");
}
