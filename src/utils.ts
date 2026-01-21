// src/utils.ts

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidXArticleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const validHosts = ["x.com", "twitter.com", "www.x.com", "www.twitter.com"];
    if (!validHosts.includes(parsed.hostname)) return false;
    // Accept both /article/ and /status/ URLs
    return /^\/[^/]+\/(article|status)\/\d+/.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function getConfigDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "~";
  return `${home}/.clipmd`;
}

export function ensureDir(path: string): void {
  const fs = require("fs");
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
}

export function uniquePath(basePath: string): string {
  const fs = require("fs");
  if (!fs.existsSync(basePath)) return basePath;

  let counter = 1;
  let newPath = `${basePath}-${counter}`;
  while (fs.existsSync(newPath)) {
    counter++;
    newPath = `${basePath}-${counter}`;
  }
  return newPath;
}
