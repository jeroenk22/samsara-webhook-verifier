import fs from "fs";
import path from "path";

export const getConfig = () => {
  const configPath = path.resolve("config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  console.log("Config webhookChoice:", config.webhookChoice);
  return config;
};

export const getWhitelist = () => {
  const whitelistPath = path.resolve("whitelist.json");
  return JSON.parse(fs.readFileSync(whitelistPath, "utf-8"));
};

export const isIpWhitelisted = (clientIp, whitelist) => {
  return whitelist.whitelisted_ips.includes(clientIp);
};
