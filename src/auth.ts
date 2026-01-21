// src/auth.ts
import fs from "fs";
import path from "path";
import { getConfigDir, ensureDir } from "./utils";

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export function getCookiesPath(configDir?: string): string {
  const dir = configDir || getConfigDir();
  return path.join(dir, "cookies.json");
}

export function loadCookies(configDir?: string): Cookie[] | undefined {
  // First check environment variable
  const envCookies = process.env.X_AUTH_COOKIES;
  if (envCookies) {
    try {
      return JSON.parse(envCookies);
    } catch {
      console.error("Warning: X_AUTH_COOKIES env var contains invalid JSON");
    }
  }

  // Then check file
  const cookiesPath = getCookiesPath(configDir);
  if (!fs.existsSync(cookiesPath)) {
    return undefined;
  }

  try {
    const content = fs.readFileSync(cookiesPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

export function saveCookies(cookies: Cookie[], configDir?: string): void {
  const dir = configDir || getConfigDir();
  ensureDir(dir);
  const cookiesPath = getCookiesPath(configDir);
  fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
}

export function clearCookies(configDir?: string): void {
  const cookiesPath = getCookiesPath(configDir);
  if (fs.existsSync(cookiesPath)) {
    fs.unlinkSync(cookiesPath);
  }
}
