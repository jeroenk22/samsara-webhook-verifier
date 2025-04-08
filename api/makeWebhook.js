import fetch from "node-fetch";

// Verzend gegevens naar de Make.com Webhook
export const sendToMakeWebhook = (makeWebhookUrl, data) => {
  return fetch(makeWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.text())
    .then((data) => {
      console.log("Make.com response:", data);
      return data;
    })
    .catch((error) => {
      console.error("Error forwarding to Make.com:", error);
      throw error;
    });
};
