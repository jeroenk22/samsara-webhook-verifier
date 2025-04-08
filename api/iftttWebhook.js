import fetch from "node-fetch";

// Verzend gegevens naar de IFTTT Webhook
export const sendToIftttWebhook = (iftttWebhookUrl, data) => {
  return fetch(iftttWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.text())
    .then((data) => {
      console.log("IFTTT response:", data);
      return data;
    })
    .catch((error) => {
      console.error("Error forwarding to IFTTT:", error);
      throw error;
    });
};
