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

  // Gebruik switch om de juiste webhook(s) aan te roepen op basis van de config
  switch (config.webhookChoice) {
    case "make":
      console.log("Sending data to Make.com webhook...");
      sendToMakeWebhook(makeWebhookUrl, parsedBody)
        .then((data) => {
          responseData += `Make.com response: ${data}\n`;
        })
        .catch((error) => {
          console.error("Error forwarding to Make.com:", error);
          responseData += `Error forwarding to Make.com: ${error.message}\n`;
        });
      break;

    case "ifttt":
      console.log("Sending data to IFTTT webhook...");
      sendToIftttWebhook(iftttWebhookUrl, parsedBody)
        .then((data) => {
          responseData += `IFTTT response: ${data}\n`;
        })
        .catch((error) => {
          console.error("Error forwarding to IFTTT:", error);
          responseData += `Error forwarding to IFTTT: ${error.message}\n`;
        });
      break;

    case "both":
      console.log("Sending data to both Make.com and IFTTT webhooks...");
      // Eerst naar Make.com
      sendToMakeWebhook(makeWebhookUrl, parsedBody)
        .then((data) => {
          responseData += `Make.com response: ${data}\n`;
        })
        .catch((error) => {
          console.error("Error forwarding to Make.com:", error);
          responseData += `Error forwarding to Make.com: ${error.message}\n`;
        });

      // Dan naar IFTTT
      sendToIftttWebhook(iftttWebhookUrl, parsedBody)
        .then((data) => {
          responseData += `IFTTT response: ${data}\n`;
        })
        .catch((error) => {
          console.error("Error forwarding to IFTTT:", error);
          responseData += `Error forwarding to IFTTT: ${error.message}\n`;
        });
      break;

    default:
      console.log("No valid webhook configuration found.");
      responseData = "No valid webhook configuration found.";
  }

  return responseData;
};
