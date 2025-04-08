import { createHmac } from "crypto";

export const verifySamsaraSignature = (
  secret,
  timestamp,
  body,
  samsaraSignature
) => {
  const message = `v1:${timestamp}:${body}`;
  console.log("Message to sign:", message);

  const hmac = createHmac("sha256", secret);
  hmac.update(message);

  const expectedSignature = "v1=" + hmac.digest("hex");
  console.log("Expected signature:", expectedSignature);
  console.log("Received signature:", samsaraSignature);

  const isSignatureValid = expectedSignature === samsaraSignature;
  console.log("Signature valid:", isSignatureValid);

  return isSignatureValid;
};
