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

// Laad de whitelist van IP-adressen uit het whitelist.json bestand in de root van het project
const whitelistPath = path.resolve("whitelist.json");
const whitelist = JSON.parse(fs.readFileSync(whitelistPath, "utf-8"));

// Maak een nieuwe Express-applicatie
const app = express();
const port = process.env.PORT || 3000;

// Laad de omgevingsvariabelen
const webhookUrl = process.env.WEBHOOK_URL;
const secretKey = process.env.SECRET_KEY;

// Log de belangrijke instellingen zonder gevoelige data (SECRET_KEY)
console.log("Webhook URL:", webhookUrl);

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

  // Filter op basis van eventType (GeofenceEntry of GeofenceExit)
  const allowedEventTypes = ["GeofenceEntry", "GeofenceExit"];

  // Strip eventuele extra spaties en controleer hoofdlettergevoeligheid
  const eventType = body.eventType.trim();
  if (!allowedEventTypes.includes(eventType)) {
    console.log(
      `Skipping event, eventType is ${eventType}, which is neither GeofenceEntry nor GeofenceExit`
    );
    return res.status(200).send("Event skipped");
  }

  console.log(`EventType is ${eventType}, forwarding data to Make.com`);

  // Verzend de data naar Make.com Webhook
  fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(JSON.parse(body)), // Converteer de body naar JSON
  })
    .then((response) => {
      console.log("Response Status:", response.status);
      return response.text(); // Gebruik .text() om de response als tekst op te halen
    })
    .then((data) => {
      console.log("Raw Response Data:", data); // Log de raw response van Make.com
      if (data === "Accepted") {
        console.log("Successfully forwarded to Make.com");
        res.status(200).send("Successfully forwarded to Make.com");
      } else {
        console.error("Unexpected response from Make.com:", data);
        res.status(500).send("Unexpected response from Make.com");
      }
    })
    .catch((err) => {
      console.error("Error forwarding data:", err);
      res.status(500).send("Failed to forward data");
    });
});

// Start de server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
