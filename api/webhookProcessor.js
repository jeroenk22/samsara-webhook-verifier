import { sendToMakeWebhook } from "./makeWebhook.js";
import { sendToIftttWebhook } from "./iftttWebhook.js";

export const processWebhook = async (
  config,
  eventType,
  parsedBody,
  makeWebhookUrl,
  iftttWebhookUrl
) => {
  let responseData = "";

  try {
    console.log("Config webhookChoice:", config.webhookChoice); // Log de webhookChoice

    if (eventType === "GeofenceEntry" || eventType === "GeofenceExit") {
      if (config.webhookChoice === "make") {
        console.log("Sending data to Make.com webhook...");
        const makeResponse = await sendToMakeWebhook(
          makeWebhookUrl,
          parsedBody
        );
        responseData += `Make.com response: ${makeResponse}\n`;
        console.log("Make webhook called"); // Add log
      } else if (config.webhookChoice === "ifttt") {
        console.log("Sending data to IFTTT webhook...");
        const iftttResponse = await sendToIftttWebhook(
          iftttWebhookUrl,
          parsedBody
        );
        responseData += `IFTTT response: ${iftttResponse}\n`;
        console.log("IFTTT webhook called"); // Add log
      } else if (config.webhookChoice === "both") {
        console.log("Sending data to Make.com webhook...");
        const makeResponse = await sendToMakeWebhook(
          makeWebhookUrl,
          parsedBody
        );
        responseData += `Make.com response: ${makeResponse}\n`;
        console.log("Make webhook called"); // Add log

        console.log("Sending data to IFTTT webhook...");
        const iftttResponse = await sendToIftttWebhook(
          iftttWebhookUrl,
          parsedBody
        );
        responseData += `IFTTT response: ${iftttResponse}\n`;
        console.log("IFTTT webhook called"); // Add log
      }
    } else {
      console.log(
        `Skipping event, eventType is ${eventType}, which is neither GeofenceEntry nor GeofenceExit`
      );
      return "Event skipped";
    }

    return responseData;
  } catch (error) {
    console.error("Error processing webhooks:", error);
    throw error;
  }
};
