import fs from "fs";
import path from "path";

// Haal de config op uit het config bestand
export const getConfig = () => {
  const configPath = path.resolve("config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  console.log("Config webhookChoice:", config.webhookChoice); // Log de webhookChoice
  return config;
};

// Haal de whitelist van IP-adressen op
export const getWhitelist = () => {
  const whitelistPath = path.resolve("whitelist.json");
  return JSON.parse(fs.readFileSync(whitelistPath, "utf-8"));
};

// Controleer of het client IP in de whitelist staat
export const isIpWhitelisted = (clientIp, whitelist) => {
  return whitelist.whitelisted_ips.includes(clientIp);
};
