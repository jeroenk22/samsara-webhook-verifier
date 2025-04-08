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
    if (config.webhookChoice === "make" || config.webhookChoice === "both") {
      console.log("Sending data to Make.com webhook...");
      const makeResponse = await sendToMakeWebhook(makeWebhookUrl, parsedBody);
      responseData += `Make.com response: ${makeResponse}\n`;
    }

    if (config.webhookChoice === "ifttt" || config.webhookChoice === "both") {
      console.log("Sending data to IFTTT webhook...");
      const iftttResponse = await sendToIftttWebhook(
        iftttWebhookUrl,
        parsedBody
      );
      responseData += `IFTTT response: ${iftttResponse}\n`;
    }

    return responseData;
  } catch (error) {
    console.error("Error processing webhooks:", error);
    throw error;
  }
};
