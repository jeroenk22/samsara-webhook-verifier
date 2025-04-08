import express from "express";
import bodyParser from "body-parser";
import { verifySamsaraSignature } from "./verifySignature.js"; // Import signature verification
import { getConfig, getWhitelist, isIpWhitelisted } from "./webhookUtils.js"; // Import utility functions
import { processWebhook } from "./webhookProcessor.js"; // Import webhook processing logic

// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

// Create new Express app
const app = express();
const port = process.env.PORT || 3000;

// Load config and whitelist
const config = getConfig();
const whitelist = getWhitelist();

// Load Webhook URLs from .env
const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
const iftttWebhookUrl = process.env.IFTTT_WEBHOOK_URL;
const secretKey = process.env.SECRET_KEY;

// Log important settings without sensitive data (SECRET_KEY)
console.log("Webhook URL for Make.com:", makeWebhookUrl);
console.log("Webhook URL for IFTTT:", iftttWebhookUrl);

// If SECRET_KEY is not loaded, stop the server with an error message
if (!secretKey) {
  console.error("Error: SECRET_KEY is not set in the .env file");
  process.exit(1);
}

// Decode the secret key from Base64
const secret = Buffer.from(secretKey, "base64");

// Set up server to process incoming requests
app.use(bodyParser.raw({ type: "application/json" }));

// POST route to receive webhook requests
app.post("/api/webhook-handler", (req, res) => {
  // Get the IP address from the request headers
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log("Client IP:", clientIp);

  // Check if the IP address is in the whitelist
  if (!isIpWhitelisted(clientIp, whitelist)) {
    console.log("IP address is not whitelisted:", clientIp);
    return res.status(403).send("Forbidden: IP not whitelisted");
  }

  console.log("IP address is whitelisted, processing request");

  const timestamp = req.headers["x-samsara-timestamp"];
  const samsaraSignature = req.headers["x-samsara-signature"];
  const body = req.body;

  // Check if the required headers are present
  if (!timestamp || !samsaraSignature) {
    console.log("Missing signature or timestamp in the request");
    return res.status(400).send("Missing signature or timestamp");
  }

  console.log("Timestamp:", timestamp);

  // Create the message to sign
  const message = `v1:${timestamp}:${body.toString()}`;
  console.log("Message to sign:", message);

  // Calculate the expected signature
  const hmac = createHmac("sha256", secret);
  hmac.update(message);
  const expectedSignature = "v1=" + hmac.digest("hex");
  console.log("Expected signature:", expectedSignature);

  // Compare the signatures
  if (expectedSignature !== samsaraSignature) {
    console.log("Signature mismatch");
    return res.status(400).send("Signature mismatch");
  }

  console.log("Signature matched, processing event");

  // Parse the body into JSON
  let parsedBody;
  try {
    parsedBody = JSON.parse(body.toString());
  } catch (error) {
    console.log("Error parsing JSON body:", error);
    return res.status(400).send("Invalid JSON body");
  }

  // Log the full request body to see what is coming in
  console.log("Full request body:", parsedBody);

  // Filter based on eventType (GeofenceEntry or GeofenceExit)
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

  // Choose which webhook(s) to send based on the config
  const webhookUrls = [];

  if (config.webhookChoice === "make" || config.webhookChoice === "both") {
    webhookUrls.push(makeWebhookUrl); // Add Make.com URL
  }

  if (config.webhookChoice === "ifttt" || config.webhookChoice === "both") {
    webhookUrls.push(iftttWebhookUrl); // Add IFTTT URL
  }

  // Send the message to the selected webhooks
  Promise.all(
    webhookUrls.map((url) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedBody),
      })
    )
  )
    .then((responses) => {
      responses.forEach((response, index) => {
        console.log(
          `Webhook ${webhookUrls[index]} responded with status: ${response.status}`
        );
        response
          .text()
          .then((data) =>
            console.log(`Response from ${webhookUrls[index]}: ${data}`)
          );
      });
      res.status(200).send("Event successfully processed");
    })
    .catch((err) => {
      console.error("Error forwarding data:", err);
      res.status(500).send("Failed to forward data");
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
