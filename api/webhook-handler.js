import { createHmac } from "crypto"; // HMAC SHA-256 van crypto importeren
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch"; // Gebruik import in plaats van require

const app = express();
const port = process.env.PORT || 3000;

// Haal de webhook URL uit de omgevingsvariabelen
const webhookUrl = process.env.WEBHOOK_URL;

// Log de webhook URL om te bevestigen dat het goed geladen wordt
console.log("Webhook URL:", webhookUrl);

// Decodeer de geheime sleutel van Base64
const secret = Buffer.from(process.env.SECRET_KEY, "base64");

// Log de geheime sleutel (in principe als een buffer, dit zou je niet in productie willen loggen)
console.log("Decoded secret key:", secret);

// Stel de server in om inkomende verzoeken te verwerken
app.use(bodyParser.raw({ type: "application/json" }));

// Debugging: Log wanneer de server een verzoek ontvangt
app.post("/", (req, res) => {
  console.log("Received POST request to /api");

  // Log de headers om te controleren of de benodigde headers aanwezig zijn
  console.log("Headers:", req.headers);

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

  // Handtekening is geldig, stuur door naar Make.com Webhook
  fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
    .then((response) => {
      console.log("Data forwarded to Make.com");
      return response.json();
    })
    .then((data) => res.status(200).send("Successfully forwarded to Make.com"))
    .catch((err) => {
      console.error("Error forwarding data:", err);
      res.status(500).send("Failed to forward data");
    });
});

// Start de server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
