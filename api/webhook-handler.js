import express from "express";
import bodyParser from "body-parser";
import { verifySamsaraSignature } from "./verifySignature.js"; // Functie voor signature verificatie
import { getConfig, getWhitelist, isIpWhitelisted } from "./webhookUtils.js"; // Utility-functies
import { processWebhook } from "./webhookProcessor.js"; // Verwerkingslogica voor webhooks
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const config = getConfig();
const whitelist = getWhitelist();
const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
const iftttWebhookUrl = process.env.IFTTT_WEBHOOK_URL;

console.log(`Active webhook choice: ${config.webhookChoice}`);

app.use(bodyParser.raw({ type: "application/json" }));

// POST route voor het ontvangen van webhook-verzoeken
app.post("/api/webhook-handler", (req, res) => {
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log("Client IP:", clientIp);

  // 1. Whitelist Check
  if (!isIpWhitelisted(clientIp, whitelist)) {
    console.log("IP address is not whitelisted:", clientIp);
    return res.status(403).send("Forbidden: IP not whitelisted");
  }

  console.log("IP address is whitelisted, processing request");

  const timestamp = req.headers["x-samsara-timestamp"];
  const samsaraSignature = req.headers["x-samsara-signature"];
  const body = req.body;

  // 2. Signature Check
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

  let parsedBody;
  try {
    parsedBody = JSON.parse(body.toString());
  } catch (error) {
    console.log("Error parsing JSON body:", error);
    return res.status(400).send("Invalid JSON body");
  }

  console.log("Full request body:", parsedBody);

  // 3. EventType Check
  const allowedEventTypes = ["GeofenceEntry", "GeofenceExit"];
  const eventType = parsedBody.eventType ? parsedBody.eventType.trim() : "";

  if (!allowedEventTypes.includes(eventType)) {
    console.log(
      `Skipping event, eventType is ${eventType}, which is neither GeofenceEntry nor GeofenceExit`
    );
    return res.status(200).send("Event skipped");
  }

  // 4. Process the event and send it to the appropriate webhook(s)
  const responseData = processWebhook(
    config,
    eventType,
    parsedBody,
    makeWebhookUrl,
    iftttWebhookUrl
  );

  console.log("Response Data:", responseData);

  return res.status(200).send("Event processed");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
