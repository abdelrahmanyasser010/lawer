const DEFAULT_FRONTEND_URL = "http://localhost:3000";

export const FRONTEND_APP_URL = (
  process.env.NEXT_PUBLIC_FRONTEND_URL || DEFAULT_FRONTEND_URL
).replace(/\/$/, "");

export function frontendContractUrl(contractId: string | number) {
  return `${FRONTEND_APP_URL}/contract/${contractId}`;
}
