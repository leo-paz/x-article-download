// src/scraper.ts
import { chromium, Browser, Page, BrowserContext } from "playwright";
import type { Cookie } from "./auth";
import type { Article, ArticleMetadata } from "./types";
import { parseArticlePage, extractMediaUrls, htmlToMarkdown } from "./parser";

let browser: Browser | null = null;

export async function initBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export async function createContextWithCookies(
  browser: Browser,
  cookies?: Cookie[]
): Promise<BrowserContext> {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  if (cookies && cookies.length > 0) {
    await context.addCookies(
      cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || "/",
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
      }))
    );
  }

  return context;
}

export async function interactiveLogin(browser: Browser): Promise<Cookie[]> {
  console.log("Opening browser for login. Please log in to X...");

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://x.com/login");

  // Wait for user to complete login (detect home page or profile)
  console.log("Waiting for login to complete...");
  await page.waitForURL(/x\.com\/(home|[^/]+$)/, { timeout: 300000 }); // 5 min timeout

  console.log("Login detected. Saving cookies...");

  const cookies = await context.cookies();
  await context.close();

  return cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    expires: c.expires,
    httpOnly: c.httpOnly,
    secure: c.secure,
    sameSite: c.sameSite as Cookie["sameSite"],
  }));
}

export async function scrapeArticle(
  url: string,
  cookies: Cookie[],
  verbose: boolean = false
): Promise<Article> {
  const browser = await initBrowser();
  const context = await createContextWithCookies(browser, cookies);
  const page = await context.newPage();

  try {
    if (verbose) console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "networkidle" });

    // Wait for article content to load
    await page.waitForSelector("article", { timeout: 30000 });

    if (verbose) console.log("Extracting article content...");

    // Extract metadata
    const metadata = await page.evaluate(() => {
      const title =
        document.querySelector("article h1")?.textContent ||
        document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
        "Untitled";

      const authorEl = document.querySelector('article a[href*="/"]');
      const authorUrl = authorEl?.getAttribute("href") || "";
      const author = authorUrl.split("/").pop() || "unknown";

      const timeEl = document.querySelector("article time");
      const date = timeEl?.getAttribute("datetime") || new Date().toISOString();

      // Try to get engagement metrics
      const statsText = document.body.innerText;
      const likesMatch = statsText.match(/(\d+(?:,\d+)*)\s*(?:Likes?|likes?)/);
      const repostsMatch = statsText.match(/(\d+(?:,\d+)*)\s*(?:Reposts?|reposts?)/);

      return {
        title: title.trim(),
        author,
        authorUrl: authorUrl.startsWith("http") ? authorUrl : `https://x.com${authorUrl}`,
        date,
        likes: likesMatch ? parseInt(likesMatch[1].replace(/,/g, "")) : undefined,
        reposts: repostsMatch ? parseInt(repostsMatch[1].replace(/,/g, "")) : undefined,
      };
    });

    // Extract article HTML content
    const articleHtml = await page.evaluate(() => {
      const article = document.querySelector("article");
      if (!article) return "";

      // Find the main content area (usually after the header)
      const contentArea = article.querySelector('[data-testid="tweetText"]')?.parentElement?.parentElement;
      return contentArea?.innerHTML || article.innerHTML;
    });

    if (verbose) console.log("Parsing article content...");

    const article = parseArticlePage(articleHtml, url, metadata);

    await context.close();
    return article;
  } catch (error) {
    await context.close();
    throw error;
  }
}
