import { createHmac } from "crypto";

export const verifySamsaraSignature = (
  secretBase64, // The base64 encoded secret key
  timestamp,
  body, // The raw request body as a string
  samsaraSignature
) => {
  try {
    // Step 1: Decode the secret key
    const secret = Buffer.from(secretBase64, "base64");

    // Step 3: Prepare the message for the HMAC SHA-256 algorithm
    const message = `v1:${timestamp}:${body}`;
    console.log("Message to sign:", message);

    // Step 4: Determine the expected signature
    const hmac = createHmac("sha256", secret);
    hmac.update(message);
    const expectedSignature = "v1=" + hmac.digest("hex");
    console.log("Expected signature:", expectedSignature);
    console.log("Received signature:", samsaraSignature);

    // Step 5: Compare the signatures
    const isSignatureValid = expectedSignature === samsaraSignature;
    console.log("Signature valid:", isSignatureValid);

    return isSignatureValid;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false; // Return false on error
  }
};
