// Laad de omgevingsvariabelen uit het .env bestand
import dotenv from "dotenv";
dotenv.config();

// Importeer de benodigde modules
import express from "express";
import bodyParser from "body-parser";
import { createHmac } from "crypto";
import fetch from "node-fetch";
import fs from "fs"; // Dit gebruiken we om het whitelist bestand in te laden
import path from "path"; // Voor het correct omgaan met het pad naar het whitelist bestand

// Laad de whitelist van IP-adressen uit het whitelist.json bestand in de root van het project
const whitelistPath = path.resolve("whitelist.json"); // Resolving het pad naar de root
const whitelist = JSON.parse(fs.readFileSync(whitelistPath, "utf-8")); // Leest het bestand uit

// Maak een nieuwe Express-applicatie
const app = express();
const port = process.env.PORT || 3000;

// Laad de omgevingsvariabelen
const webhookUrl = process.env.WEBHOOK_URL; // De URL van de Make.com webhook
const secretKey = process.env.SECRET_KEY; // De geheime sleutel voor de handtekeningcontrole

// Log de omgevingsvariabelen om te controleren of ze goed geladen zijn
console.log("Webhook URL:", webhookUrl);
console.log("SECRET_KEY:", secretKey); // Controleer of SECRET_KEY goed geladen wordt
console.log("Whitelisted IPs:", whitelist.whitelisted_ips); // Controleer of de IPs goed geladen worden

// Als SECRET_KEY niet geladen is, stop de server met een foutmelding
if (!secretKey) {
  console.error("Error: SECRET_KEY is not set in the .env file");
  process.exit(1); // Stop de server als de SECRET_KEY ontbreekt
}

// Decodeer de geheime sleutel van Base64
const secret = Buffer.from(secretKey, "base64");

// Stel de server in om inkomende verzoeken te verwerken
app.use(bodyParser.raw({ type: "application/json" }));

// POST route voor het ontvangen van webhook-verzoeken
app.post("/api/webhook-handler", (req, res) => {
  // Haal het IP adres op uit de request headers
  const clientIp =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress;
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
  console.log("Samsara Signature:", samsaraSignature);

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

  console.log("Signature matched, forwarding data to Make.com webhook");

  // Converteer de body naar JSON voordat we deze doorsturen
  const jsonBody = JSON.parse(body);

  // Handtekening is geldig, stuur de data door naar Make.com Webhook
  fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(jsonBody), // Zorg ervoor dat de body als JSON wordt doorgegeven
  })
    .then((response) => {
      console.log("Response Status:", response.status); // Log de status van de response
      return response.text(); // Gebruik .text() om de response als tekst op te halen
    })
    .then((data) => {
      console.log("Raw Response Data:", data); // Log de raw response van Make.com
      // Maak de aanname dat de response een string is
      if (data === "Accepted") {
        console.log("Successfully forwarded to Make.com");
        res.status(200).send("Successfully forwarded to Make.com");
      } else {
        // Als de response iets anders is, log dit en stuur een foutmelding
        console.error("Unexpected response from Make.com:", data);
        res.status(500).send("Unexpected response from Make.com");
      }
    })
    .catch((err) => {
      // Log eventuele fouten bij het versturen van de data naar Make.com
      console.error("Error forwarding data:", err);
      res.status(500).send("Failed to forward data");
    });
});

// Start de server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
