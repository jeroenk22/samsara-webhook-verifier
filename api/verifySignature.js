import { createHmac } from "crypto";

// Functie om de handtekening te controleren
export const verifySamsaraSignature = (
  secret,
  timestamp,
  body,
  samsaraSignature
) => {
  // Zorg ervoor dat de body een string is
  const bodyString = body.toString();
  console.log("Body string to sign:", bodyString); // Log de body die je gaat ondertekenen

  // Bouw het bericht voor de handtekening
  const message = `v1:${timestamp}:${bodyString}`;
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
