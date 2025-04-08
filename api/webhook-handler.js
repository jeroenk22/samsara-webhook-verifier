// Laad de omgevingsvariabelen uit het .env bestand
import dotenv from "dotenv";
dotenv.config();

// Importeer de benodigde modules
import express from "express";
import bodyParser from "body-parser";
import { createHmac } from "crypto";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

// Laad de config uit config.json
const configPath = path.resolve("config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Laad de whitelist van IP-adressen uit het whitelist.json bestand in de root van het project
const whitelistPath = path.resolve("whitelist.json");
const whitelist = JSON.parse(fs.readFileSync(whitelistPath, "utf-8"));

// Maak een nieuwe Express-applicatie
const app = express();
const port = process.env.PORT || 3000;

// Laad de omgevingsvariabelen
const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
const iftttWebhookUrl = process.env.IFTTT_WEBHOOK_URL;
const secretKey = process.env.SECRET_KEY;

// Log de belangrijke instellingen zonder gevoelige data (SECRET_KEY)
console.log("Make Webhook URL:", makeWebhookUrl);
console.log("IFTTT Webhook URL:", iftttWebhookUrl);

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
  // Haal het IP adres op uit de request headers
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log("Client IP:", clientIp);

  // Controleer of het IP adres in de whitelist staat
  if (!whitelist.whitelisted_ips.includes(clientIp)) {
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

  // Maak het bericht voor HMAC SHA-256
  const message = `v1:${timestamp}:${body.toString()}`;
  console.log("Message to sign:", message);

  // Bereken de verwachte handtekening
  const hmac = createHmac("sha256", secret);
  hmac.update(message);
  const expectedSignature = "v1=" + hmac.digest("hex");
  console.log("Expected signature:", expectedSignature);

  // Vergelijk de handtekeningen
  if (expectedSignature !== samsaraSignature) {
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

  // Controleer of eventType bestaat en valid is voordat je doorgaat
  const eventType = parsedBody.eventType ? parsedBody.eventType.trim() : "";

  // Log de waarde van eventType voor debugging
  console.log("Received eventType:", eventType);

  // Als het eventType niet geldig is, sla dan de verdere handelingen over
  if (!allowedEventTypes.includes(eventType)) {
    console.log(
      `Skipping event, eventType is ${eventType}, which is neither GeofenceEntry nor GeofenceExit`
    );
    return res.status(200).send("Event skipped"); // Stop de verdere verwerking
  }

  console.log(`EventType is ${eventType}, forwarding data to webhook(s)`);

  // Log de actieve config-optie voor debugging
  let activeWebhookUrl = "";
  let responseData = "";

  if (config.webhookChoice === "make" || config.webhookChoice === "both") {
    activeWebhookUrl = makeWebhookUrl; // Zet Make Webhook URL
    console.log("Active webhook URL: Make.com", activeWebhookUrl);
    // Stuur naar Make.com
    fetch(makeWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedBody), // Verstuur de geparseerde JSON
    })
      .then((response) => response.text())
      .then((data) => {
        console.log("Make.com response:", data);
        if (data === "Accepted") {
          console.log("Successfully forwarded to Make.com");
        } else {
          console.log("Unexpected response from Make.com:", data);
        }
        responseData += `Make.com response: ${data}\n`; // Voeg de Make.com response toe
      })
      .catch((error) => console.error("Error forwarding to Make.com:", error));
  }

  if (config.webhookChoice === "ifttt" || config.webhookChoice === "both") {
    activeWebhookUrl = iftttWebhookUrl; // Zet IFTTT Webhook URL
    console.log("Active webhook URL: IFTTT", activeWebhookUrl);
    // Stuur naar IFTTT
    fetch(iftttWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedBody),
    })
      .then((response) => response.text())
      .then((data) => {
        console.log("IFTTT response:", data);
        if (
          data ===
          "Congratulations! You've fired the auto_in_wageningen JSON event"
        ) {
          console.log("Successfully forwarded to IFTTT");
        } else {
          console.log("Unexpected response from IFTTT:", data);
        }
        responseData += `IFTTT response: ${data}\n`; // Voeg de IFTTT response toe
      })
      .catch((error) => console.error("Error forwarding to IFTTT:", error));
  }

  res.status(200).send(`Webhook processed: \n${responseData}`);
});

// Start de server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
