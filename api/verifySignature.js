import { createHmac } from "crypto";

// Functie om de handtekening te controleren
export const verifySamsaraSignature = (
  secret,
  timestamp,
  body,
  samsaraSignature
) => {
  const message = `v1:${timestamp}:${body}`;
  const hmac = createHmac("sha256", secret);
  hmac.update(message);
  const expectedSignature = "v1=" + hmac.digest("hex");

  return expectedSignature === samsaraSignature;
};
