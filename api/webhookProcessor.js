import { sendToMakeWebhook } from "./makeWebhook.js";
import { sendToIftttWebhook } from "./iftttWebhook.js";

// Verwerk het event en stuur naar de juiste webhook(s)
export const processWebhook = (
  config,
  eventType,
  parsedBody,
  makeWebhookUrl,
  iftttWebhookUrl
) => {
  let responseData = "";

  // Verzend naar Make.com als de configuratie 'make' of 'both' is
  if (config.webhookChoice === "make" || config.webhookChoice === "both") {
    console.log("Sending data to Make.com webhook...");
    sendToMakeWebhook(makeWebhookUrl, parsedBody)
      .then((data) => {
        responseData += `Make.com response: ${data}\n`;
      })
      .catch((error) => {
        console.error("Error forwarding to Make.com:", error);
        responseData += `Error forwarding to Make.com: ${error.message}\n`;
      });
  }

  // Verzend naar IFTTT als de configuratie 'ifttt' of 'both' is
  if (config.webhookChoice === "ifttt" || config.webhookChoice === "both") {
    console.log("Sending data to IFTTT webhook...");
    sendToIftttWebhook(iftttWebhookUrl, parsedBody)
      .then((data) => {
        responseData += `IFTTT response: ${data}\n`;
      })
      .catch((error) => {
        console.error("Error forwarding to IFTTT:", error);
        responseData += `Error forwarding to IFTTT: ${error.message}\n`;
      });
  }

  return responseData;
};
