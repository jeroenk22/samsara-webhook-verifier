import express from "express";
import bodyParser from "body-parser";
import { verifySamsaraSignature } from "./verifySignature.js";
import { getConfig, getWhitelist, isIpWhitelisted } from "./webhookUtils.js";
import { processWebhook } from "./webhookProcessor.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const config = getConfig();
const whitelist = getWhitelist();

const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
const iftttWebhookUrl = process.env.IFTTT_WEBHOOK_URL;
const secretKey = process.env.SECRET_KEY;

const secret = Buffer.from(secretKey, "base64");

app.use(bodyParser.raw({ type: "application/json" }));

app.post("/api/webhook-handler", (req, res) => {
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log("Client IP:", clientIp);

  if (!isIpWhitelisted(clientIp, whitelist)) {
    console.log("IP address is not whitelisted:", clientIp);
    return res.status(403).send("Forbidden: IP not whitelisted");
  }

  console.log("IP address is whitelisted, processing request");

  const timestamp = req.headers["x-samsara-timestamp"];
  const samsaraSignature = req.headers["x-samsara-signature"];
  const body = req.body.toString(); // Body als string voor signature verificatie

  console.log("Timestamp:", timestamp);
  console.log("Body:", body);

  const isSignatureValid = verifySamsaraSignature(
    secret, // Gebruik de gedecodeerde secret buffer
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
    parsedBody = JSON.parse(body); // Parse de body na de signature verificatie
  } catch (error) {
    console.log("Error parsing JSON body:", error);
    return res.status(400).send("Invalid JSON body");
  }

  const eventType = parsedBody.eventType ? parsedBody.eventType.trim() : "";

  processWebhook(config, eventType, parsedBody, makeWebhookUrl, iftttWebhookUrl)
    .then((responseData) => {
      console.log("Response Data:", responseData);
      res.status(200).send("Event successfully processed");
    })
    .catch((error) => {
      console.error("Error processing webhook:", error);
      res.status(500).send("Internal Server Error");
    });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
