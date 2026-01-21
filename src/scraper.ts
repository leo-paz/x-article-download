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

export async function interactiveLogin(_browser?: Browser): Promise<Cookie[]> {
  console.log("Opening browser for login. Please log in to X...");

  // Try to find Chrome user data directory for persistent context
  const home = process.env.HOME || process.env.USERPROFILE || "~";
  const chromeUserDataDir = `${home}/Library/Application Support/Google/Chrome`;
  const fs = require("fs");

  let context: BrowserContext;
  let shouldCloseBrowser = false;
  let visibleBrowser: Browser | null = null;

  // Check if Chrome profile exists and try to use it
  if (fs.existsSync(chromeUserDataDir)) {
    console.log("Found Chrome profile. Using persistent context with your profile...");
    console.log("Note: Please close Chrome if it's already running to avoid conflicts.");

    try {
      // Use launchPersistentContext to get access to the user's Chrome profile
      context = await chromium.launchPersistentContext(chromeUserDataDir, {
        headless: false,
        channel: "chrome",
        args: ["--profile-directory=Default"],
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`Could not use Chrome profile (${errorMessage}). Using fresh browser...`);
      visibleBrowser = await chromium.launch({
        headless: false,
        channel: "chrome",
      });
      context = await visibleBrowser.newContext();
      shouldCloseBrowser = true;
    }
  } else {
    // Fallback to fresh browser
    visibleBrowser = await chromium.launch({
      headless: false,
      channel: "chrome",
    });
    context = await visibleBrowser.newContext();
    shouldCloseBrowser = true;
  }

  const page = context.pages()[0] || (await context.newPage());

  try {
    await page.goto("https://x.com/login");

    // Wait for user to complete login (detect home page or profile)
    console.log("Waiting for login to complete...");
    console.log("(You have 5 minutes to log in)");
    await page.waitForURL(/x\.com\/(home|[^/]+$)/, { timeout: 300000 }); // 5 min timeout

    console.log("Login detected. Saving cookies...");

    const cookies = await context.cookies();

    await context.close();
    if (shouldCloseBrowser && visibleBrowser) {
      await visibleBrowser.close();
    }

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
  } catch (error) {
    await context.close();
    if (shouldCloseBrowser && visibleBrowser) {
      await visibleBrowser.close();
    }
    throw error;
  }
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
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

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

    // Extract article HTML content - targeting X Article specific structure
    const articleHtml = await page.evaluate(() => {
      // For X Articles, look for the article body content specifically
      // X Articles have a different structure than regular tweets

      // Try to find the article content container
      const articleBody = document.querySelector('[data-testid="article-body"]');
      if (articleBody) {
        return articleBody.innerHTML;
      }

      // Fallback: collect all tweet text blocks (the actual content)
      const tweetTexts = document.querySelectorAll('[data-testid="tweetText"]');
      if (tweetTexts.length > 0) {
        // Get all text content, filtering out the profile header area
        const contentParts: string[] = [];
        tweetTexts.forEach((el) => {
          contentParts.push(el.innerHTML);
        });
        return contentParts.join("\n\n");
      }

      // Last resort: get article element but strip out known UI elements
      const article = document.querySelector("article");
      if (!article) return "";

      // Clone to avoid modifying the page
      const clone = article.cloneNode(true) as HTMLElement;

      // Remove known UI elements
      const selectorsToRemove = [
        '[data-testid="User-Name"]',
        '[data-testid="UserAvatar-Container"]',
        '[role="group"]', // engagement buttons
        'time',
        '[data-testid="app-text-transition-container"]', // metrics like "146", "428"
      ];

      selectorsToRemove.forEach(selector => {
        clone.querySelectorAll(selector).forEach(el => el.remove());
      });

      return clone.innerHTML;
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
