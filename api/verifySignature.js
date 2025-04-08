import { createHmac } from "crypto";

// Functie om de handtekening te controleren
export const verifySamsaraSignature = (
  secret,
  timestamp,
  body,
  samsaraSignature
) => {
  // Maak de boodschap die ondertekend moet worden exact zoals het ontvangen is
  const message = `v1:${timestamp}:${body.toString()}`;
  console.log("Message to sign:", message); // Log het bericht dat je gaat ondertekenen

  // Maak een HMAC aan met de geheime sleutel
  const hmac = createHmac("sha256", secret);
  hmac.update(message);

  // Bereken de verwachte handtekening
  const expectedSignature = "v1=" + hmac.digest("hex");
  console.log("Expected signature:", expectedSignature); // Log de verwachte handtekening

  // Vergelijk de handtekeningen
  const isSignatureValid = expectedSignature === samsaraSignature;
  console.log("Received signature:", samsaraSignature); // Log de ontvangen handtekening
  console.log("Signature valid:", isSignatureValid); // Log het resultaat van de vergelijking

  return isSignatureValid;
};
