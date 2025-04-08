import express from "express";
import bodyParser from "body-parser";
import { verifySamsaraSignature } from "./verifySignature.js"; // Importeer de handtekening verificatie
import { getConfig, getWhitelist, isIpWhitelisted } from "./webhookUtils.js"; // Importeer utility-functies
import { processWebhook } from "./webhookProcessor.js"; // Importeer de webhookverwerkingslogica
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Laad de config en whitelist
const config = getConfig();
const whitelist = getWhitelist();

// Laad de Webhook URL's uit de .env
const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL; // Make.com webhook URL
const iftttWebhookUrl = process.env.IFTTT_WEBHOOK_URL; // IFTTT webhook URL
const secretKey = process.env.SECRET_KEY;

// Log de belangrijke instellingen zonder gevoelige data (SECRET_KEY)
console.log("Webhook URL for Make.com:", makeWebhookUrl);
console.log("Webhook URL for IFTTT:", iftttWebhookUrl);

// Als SECRET_KEY niet geladen is, stop de server met een foutmelding
if (!secretKey) {
  console.error("Error: SECRET_KEY is not set in the .env file");
  process.exit(1);
}

// Decodeer de geheime sleutel van Base64
const secret = Buffer.from(secretKey, "base64");

// Stel de server in om inkomende verzoeken te verwerken
app.use(bodyParser.raw({ type: "application/json" }));

// POST route voor het ontvangen van webhook-verzoeken
app.post("/api/webhook-handler", (req, res) => {
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log("Client IP:", clientIp);

  // Controleer of het IP adres in de whitelist staat
  if (!isIpWhitelisted(clientIp, whitelist)) {
    console.log("IP address is not whitelisted:", clientIp);
    return res.status(403).send("Forbidden: IP not whitelisted");
  }

  console.log("IP address is whitelisted, processing request");

  const timestamp = req.headers["x-samsara-timestamp"];
  const samsaraSignature = req.headers["x-samsara-signature"];
  const body = req.body;

  // Zorg ervoor dat de vereiste headers aanwezig zijn
  if (!timestamp || !samsaraSignature) {
    console.log("Missing signature or timestamp in the request");
    return res.status(400).send("Missing signature or timestamp");
  }

  console.log("Timestamp:", timestamp);

  // Verifieer de handtekening
  const isSignatureValid = verifySamsaraSignature(
    process.env.SECRET_KEY,
    timestamp,
    body,
    samsaraSignature
  );

  if (!isSignatureValid) {
    console.log("Signature mismatch");
    return res.status(400).send("Signature mismatch");
  }

  console.log("Signature matched, processing event");

  // Converteer de buffer naar een string en parse de JSON
  let parsedBody;
  try {
    parsedBody = JSON.parse(body.toString());
  } catch (error) {
    console.log("Error parsing JSON body:", error);
    return res.status(400).send("Invalid JSON body");
  }

  // Log de volledige body van het verzoek om te zien wat er precies binnenkomt
  console.log("Full request body:", parsedBody);

  // Filter op basis van eventType (GeofenceEntry of GeofenceExit)
  const allowedEventTypes = ["GeofenceEntry", "GeofenceExit"];
  const eventType = parsedBody.eventType ? parsedBody.eventType.trim() : "";
  console.log("Received eventType:", eventType);

  if (!allowedEventTypes.includes(eventType)) {
    console.log(
      `Skipping event, eventType is ${eventType}, which is neither GeofenceEntry nor GeofenceExit`
    );
    return res.status(200).send("Event skipped");
  }

  console.log(`EventType is ${eventType}, forwarding data`);

  // Verwerk het event en stuur naar de juiste webhook(s)
  const responseData = processWebhook(
    config,
    eventType,
    parsedBody,
    makeWebhookUrl,
    iftttWebhookUrl
  );

  console.log("Response Data:", responseData);

  return res.status(200).send("Event successfully processed");
});

// Start de server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
