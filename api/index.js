require("dotenv").config(); // Laad omgevingsvariabelen uit het .env bestand
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const fetch = require("node-fetch");

const app = express();
const port = process.env.PORT || 3000;

// Haal de webhook URL uit de omgevingsvariabelen
const webhookUrl = process.env.WEBHOOK_URL;

// Decodeer de geheime sleutel van Base64
const secret = Buffer.from(process.env.SECRET_KEY, "base64");

// Stel de server in om inkomende verzoeken te verwerken
app.use(bodyParser.raw({ type: "application/json" }));

app.post("/webhook-url", (req, res) => {
  const timestamp = req.headers["x-samsara-timestamp"];
  const samsaraSignature = req.headers["x-samsara-signature"];
  const body = req.body;

  // Zorg ervoor dat de vereiste headers aanwezig zijn
  if (!timestamp || !samsaraSignature) {
    return res.status(400).send("Missing signature or timestamp");
  }

  // Maak het bericht voor HMAC SHA-256
  const message = `v1:${timestamp}:${body.toString()}`;

  // Bereken de verwachte handtekening
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(message);
  const expectedSignature = "v1=" + hmac.digest("hex");

  // Vergelijk de handtekeningen
  if (expectedSignature !== samsaraSignature) {
    return res.status(400).send("Signature mismatch");
  }

  // Handtekening is geldig, stuur door naar Make.com Webhook
  fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
    .then((response) => response.json())
    .then((data) => res.status(200).send("Successfully forwarded to Make.com"))
    .catch((err) => res.status(500).send("Failed to forward data"));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
