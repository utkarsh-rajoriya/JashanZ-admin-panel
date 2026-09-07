import { api } from "./client";

export const PLATFORM_INFO_KEYS = [
  "platformName",
  "supportEmail",
  "supportPhone",
  "websiteUrl",
];

export const getAllConfig = () => api.get("/admin/config");

export const setConfig = (key, value) =>
  api.post("/admin/config/set", { key, value });
