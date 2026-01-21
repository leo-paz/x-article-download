# X Article Downloader Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a CLI tool that downloads X Articles to markdown files with metadata and media.

**Architecture:** CLI parses args → auth module loads cookies → scraper fetches page with Playwright → parser extracts content → media downloader saves assets → writer generates markdown with frontmatter.

**Tech Stack:** Bun, TypeScript, Playwright, Turndown, Commander

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "x-article-download",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "x-article": "./src/index.ts"
  },
  "scripts": {
    "start": "bun run src/index.ts",
    "test": "bun test"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "playwright": "^1.40.0",
    "turndown": "^7.1.0",
    "yaml": "^2.3.0"
  },
  "devDependencies": {
    "@types/turndown": "^5.0.0",
    "typescript": "^5.3.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["bun-types"]
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create minimal src/index.ts**

```typescript
#!/usr/bin/env bun

console.log("x-article-download");
```

**Step 4: Install dependencies**

Run: `bun install`
Expected: Dependencies installed, bun.lockb created

**Step 5: Verify it runs**

Run: `bun run src/index.ts`
Expected: Outputs "x-article-download"

**Step 6: Commit**

```bash
git add package.json tsconfig.json bun.lockb src/index.ts
git commit -m "chore: project scaffolding with bun and typescript"
```

---

## Task 2: Utils Module

**Files:**
- Create: `src/utils.ts`
- Create: `src/utils.test.ts`

**Step 1: Write failing tests for slugify**

```typescript
// src/utils.test.ts
import { describe, expect, test } from "bun:test";
import { slugify, isValidXArticleUrl } from "./utils";

describe("slugify", () => {
  test("converts title to lowercase slug", () => {
    expect(slugify("Why TypeScript Won")).toBe("why-typescript-won");
  });

  test("removes special characters", () => {
    expect(slugify("Hello, World! How's it going?")).toBe("hello-world-hows-it-going");
  });

  test("collapses multiple hyphens", () => {
    expect(slugify("One   Two---Three")).toBe("one-two-three");
  });

  test("trims leading/trailing hyphens", () => {
    expect(slugify("  --Hello--  ")).toBe("hello");
  });
});

describe("isValidXArticleUrl", () => {
  test("accepts valid x.com article URL", () => {
    expect(isValidXArticleUrl("https://x.com/user/article/123")).toBe(true);
  });

  test("accepts valid twitter.com article URL", () => {
    expect(isValidXArticleUrl("https://twitter.com/user/article/123")).toBe(true);
  });

  test("rejects non-article URLs", () => {
    expect(isValidXArticleUrl("https://x.com/user/status/123")).toBe(false);
  });

  test("rejects invalid domains", () => {
    expect(isValidXArticleUrl("https://example.com/article/123")).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/utils.test.ts`
Expected: FAIL - module not found

**Step 3: Implement utils**

```typescript
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
    return /^\/[^/]+\/article\/\d+/.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function getConfigDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "~";
  return `${home}/.x-article`;
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
```

**Step 4: Run tests to verify they pass**

Run: `bun test src/utils.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/utils.ts src/utils.test.ts
git commit -m "feat: add utils module with slugify and URL validation"
```

---

## Task 3: Auth Module

**Files:**
- Create: `src/auth.ts`
- Create: `src/auth.test.ts`

**Step 1: Write failing tests**

```typescript
// src/auth.test.ts
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { getCookiesPath, loadCookies, saveCookies, clearCookies } from "./auth";
import fs from "fs";
import path from "path";

const TEST_CONFIG_DIR = "/tmp/x-article-test";

describe("auth", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_CONFIG_DIR)) {
      fs.rmSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_CONFIG_DIR)) {
      fs.rmSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  test("getCookiesPath returns correct path", () => {
    const cookiesPath = getCookiesPath(TEST_CONFIG_DIR);
    expect(cookiesPath).toBe(`${TEST_CONFIG_DIR}/cookies.json`);
  });

  test("loadCookies returns undefined when no cookies exist", () => {
    const cookies = loadCookies(TEST_CONFIG_DIR);
    expect(cookies).toBeUndefined();
  });

  test("saveCookies and loadCookies roundtrip", () => {
    const testCookies = [{ name: "auth", value: "token123", domain: ".x.com" }];
    saveCookies(testCookies, TEST_CONFIG_DIR);
    const loaded = loadCookies(TEST_CONFIG_DIR);
    expect(loaded).toEqual(testCookies);
  });

  test("clearCookies removes cookie file", () => {
    const testCookies = [{ name: "auth", value: "token123", domain: ".x.com" }];
    saveCookies(testCookies, TEST_CONFIG_DIR);
    clearCookies(TEST_CONFIG_DIR);
    expect(loadCookies(TEST_CONFIG_DIR)).toBeUndefined();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/auth.test.ts`
Expected: FAIL - module not found

**Step 3: Implement auth module**

```typescript
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
```

**Step 4: Run tests to verify they pass**

Run: `bun test src/auth.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/auth.ts src/auth.test.ts
git commit -m "feat: add auth module for cookie management"
```

---

## Task 4: Writer Module

**Files:**
- Create: `src/writer.ts`
- Create: `src/writer.test.ts`
- Create: `src/types.ts`

**Step 1: Create shared types**

```typescript
// src/types.ts

export interface ArticleMetadata {
  title: string;
  author: string;
  authorUrl: string;
  date: string;
  url: string;
  likes?: number;
  reposts?: number;
}

export interface MediaItem {
  url: string;
  type: "image" | "video";
  alt?: string;
  localPath?: string;
}

export interface Article {
  metadata: ArticleMetadata;
  content: string;
  media: MediaItem[];
}

export interface CliOptions {
  output: string;
  includeReplies: boolean;
  includeAllReplies: boolean;
  noMedia: boolean;
  format: "md" | "json";
  verbose: boolean;
}
```

**Step 2: Write failing tests for writer**

```typescript
// src/writer.test.ts
import { describe, expect, test } from "bun:test";
import { generateFrontmatter, generateMarkdown } from "./writer";
import type { Article, ArticleMetadata } from "./types";

describe("generateFrontmatter", () => {
  test("generates valid YAML frontmatter", () => {
    const metadata: ArticleMetadata = {
      title: "Test Article",
      author: "testuser",
      authorUrl: "https://x.com/testuser",
      date: "2025-01-15T10:30:00Z",
      url: "https://x.com/testuser/article/123",
      likes: 100,
      reposts: 50,
    };

    const frontmatter = generateFrontmatter(metadata);

    expect(frontmatter).toContain("title: Test Article");
    expect(frontmatter).toContain("author: testuser");
    expect(frontmatter).toContain("likes: 100");
    expect(frontmatter).toContain("downloaded_at:");
  });
});

describe("generateMarkdown", () => {
  test("combines frontmatter and content", () => {
    const article: Article = {
      metadata: {
        title: "Test Article",
        author: "testuser",
        authorUrl: "https://x.com/testuser",
        date: "2025-01-15T10:30:00Z",
        url: "https://x.com/testuser/article/123",
      },
      content: "# Test Article\n\nThis is the content.",
      media: [],
    };

    const markdown = generateMarkdown(article);

    expect(markdown).toContain("---");
    expect(markdown).toContain("title: Test Article");
    expect(markdown).toContain("# Test Article");
    expect(markdown).toContain("This is the content.");
  });

  test("replaces media URLs with local paths", () => {
    const article: Article = {
      metadata: {
        title: "Test",
        author: "user",
        authorUrl: "https://x.com/user",
        date: "2025-01-15T10:30:00Z",
        url: "https://x.com/user/article/1",
      },
      content: "![alt](https://pbs.twimg.com/media/abc.jpg)",
      media: [
        {
          url: "https://pbs.twimg.com/media/abc.jpg",
          type: "image",
          alt: "alt",
          localPath: "./media/1.jpg",
        },
      ],
    };

    const markdown = generateMarkdown(article);
    expect(markdown).toContain("![alt](./media/1.jpg)");
    expect(markdown).not.toContain("pbs.twimg.com");
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `bun test src/writer.test.ts`
Expected: FAIL - module not found

**Step 4: Implement writer module**

```typescript
// src/writer.ts
import { stringify } from "yaml";
import type { Article, ArticleMetadata } from "./types";

export function generateFrontmatter(metadata: ArticleMetadata): string {
  const frontmatterData: Record<string, unknown> = {
    title: metadata.title,
    author: metadata.author,
    author_url: metadata.authorUrl,
    date: metadata.date,
    url: metadata.url,
    downloaded_at: new Date().toISOString(),
  };

  if (metadata.likes !== undefined) {
    frontmatterData.likes = metadata.likes;
  }
  if (metadata.reposts !== undefined) {
    frontmatterData.reposts = metadata.reposts;
  }

  return `---\n${stringify(frontmatterData)}---`;
}

export function generateMarkdown(article: Article): string {
  let content = article.content;

  // Replace remote media URLs with local paths
  for (const media of article.media) {
    if (media.localPath) {
      content = content.replace(
        new RegExp(escapeRegex(media.url), "g"),
        media.localPath
      );
    }
  }

  const frontmatter = generateFrontmatter(article.metadata);
  return `${frontmatter}\n\n${content}`;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

**Step 5: Run tests to verify they pass**

Run: `bun test src/writer.test.ts`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/types.ts src/writer.ts src/writer.test.ts
git commit -m "feat: add writer module for markdown generation"
```

---

## Task 5: Media Downloader Module

**Files:**
- Create: `src/media.ts`
- Create: `src/media.test.ts`

**Step 1: Write failing tests**

```typescript
// src/media.test.ts
import { describe, expect, test } from "bun:test";
import { getMediaFilename, getMediaExtension } from "./media";

describe("getMediaExtension", () => {
  test("extracts jpg extension", () => {
    expect(getMediaExtension("https://pbs.twimg.com/media/abc.jpg")).toBe("jpg");
  });

  test("extracts png extension", () => {
    expect(getMediaExtension("https://example.com/image.png?size=large")).toBe("png");
  });

  test("defaults to jpg for unknown", () => {
    expect(getMediaExtension("https://example.com/image")).toBe("jpg");
  });
});

describe("getMediaFilename", () => {
  test("generates numbered filename for image", () => {
    expect(getMediaFilename(0, "image", "jpg")).toBe("1.jpg");
  });

  test("generates video filename", () => {
    expect(getMediaFilename(2, "video", "mp4")).toBe("video-3.mp4");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/media.test.ts`
Expected: FAIL - module not found

**Step 3: Implement media module**

```typescript
// src/media.ts
import fs from "fs";
import path from "path";
import type { MediaItem } from "./types";
import { ensureDir } from "./utils";

export function getMediaExtension(url: string): string {
  const pathname = new URL(url).pathname;
  const match = pathname.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (match) {
    const ext = match[1].toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "mp4", "webm", "mov"].includes(ext)) {
      return ext;
    }
  }
  return "jpg";
}

export function getMediaFilename(index: number, type: "image" | "video", extension: string): string {
  const num = index + 1;
  if (type === "video") {
    return `video-${num}.${extension}`;
  }
  return `${num}.${extension}`;
}

export async function downloadMedia(
  media: MediaItem[],
  outputDir: string,
  verbose: boolean = false
): Promise<MediaItem[]> {
  const mediaDir = path.join(outputDir, "media");
  ensureDir(mediaDir);

  const results: MediaItem[] = [];

  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    const extension = getMediaExtension(item.url);
    const filename = getMediaFilename(i, item.type, extension);
    const localPath = `./media/${filename}`;
    const fullPath = path.join(outputDir, "media", filename);

    try {
      if (verbose) {
        console.log(`Downloading: ${item.url}`);
      }

      const response = await fetch(item.url);
      if (!response.ok) {
        console.error(`Warning: Failed to download ${item.url}: ${response.status}`);
        results.push({ ...item, localPath: item.url }); // Keep original URL
        continue;
      }

      const buffer = await response.arrayBuffer();
      fs.writeFileSync(fullPath, Buffer.from(buffer));

      results.push({ ...item, localPath });
    } catch (error) {
      console.error(`Warning: Failed to download ${item.url}: ${error}`);
      results.push({ ...item, localPath: item.url });
    }
  }

  return results;
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test src/media.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/media.ts src/media.test.ts
git commit -m "feat: add media downloader module"
```

---

## Task 6: Parser Module

**Files:**
- Create: `src/parser.ts`
- Create: `src/parser.test.ts`

**Step 1: Write failing tests**

```typescript
// src/parser.test.ts
import { describe, expect, test } from "bun:test";
import { htmlToMarkdown, extractMediaUrls } from "./parser";

describe("htmlToMarkdown", () => {
  test("converts basic HTML to markdown", () => {
    const html = "<h1>Title</h1><p>Paragraph with <strong>bold</strong> text.</p>";
    const md = htmlToMarkdown(html);
    expect(md).toContain("# Title");
    expect(md).toContain("**bold**");
  });

  test("converts images", () => {
    const html = '<img src="https://example.com/img.jpg" alt="test image">';
    const md = htmlToMarkdown(html);
    expect(md).toContain("![test image](https://example.com/img.jpg)");
  });

  test("converts links", () => {
    const html = '<a href="https://example.com">Link text</a>';
    const md = htmlToMarkdown(html);
    expect(md).toContain("[Link text](https://example.com)");
  });
});

describe("extractMediaUrls", () => {
  test("extracts image URLs from HTML", () => {
    const html = '<img src="https://pbs.twimg.com/media/abc.jpg"><img src="https://pbs.twimg.com/media/def.png">';
    const media = extractMediaUrls(html);
    expect(media).toHaveLength(2);
    expect(media[0].type).toBe("image");
    expect(media[0].url).toBe("https://pbs.twimg.com/media/abc.jpg");
  });

  test("extracts video URLs from HTML", () => {
    const html = '<video src="https://video.twimg.com/ext/123.mp4"></video>';
    const media = extractMediaUrls(html);
    expect(media).toHaveLength(1);
    expect(media[0].type).toBe("video");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/parser.test.ts`
Expected: FAIL - module not found

**Step 3: Implement parser module**

```typescript
// src/parser.ts
import TurndownService from "turndown";
import type { MediaItem, Article, ArticleMetadata } from "./types";

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

export function htmlToMarkdown(html: string): string {
  return turndownService.turndown(html);
}

export function extractMediaUrls(html: string): MediaItem[] {
  const media: MediaItem[] = [];

  // Extract images
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    media.push({
      url: match[1],
      type: "image",
      alt: match[2] || undefined,
    });
  }

  // Extract videos
  const videoRegex = /<video[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = videoRegex.exec(html)) !== null) {
    media.push({
      url: match[1],
      type: "video",
    });
  }

  // Also check for source tags inside video elements
  const sourceRegex = /<source[^>]+src=["']([^"']+)["'][^>]*type=["']video\/[^"']+["'][^>]*>/gi;
  while ((match = sourceRegex.exec(html)) !== null) {
    // Avoid duplicates
    if (!media.some((m) => m.url === match[1])) {
      media.push({
        url: match[1],
        type: "video",
      });
    }
  }

  return media;
}

export function parseArticlePage(
  html: string,
  url: string,
  metadata: Partial<ArticleMetadata>
): Article {
  const media = extractMediaUrls(html);
  const content = htmlToMarkdown(html);

  return {
    metadata: {
      title: metadata.title || "Untitled",
      author: metadata.author || "unknown",
      authorUrl: metadata.authorUrl || "",
      date: metadata.date || new Date().toISOString(),
      url: url,
      likes: metadata.likes,
      reposts: metadata.reposts,
    },
    content,
    media,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test src/parser.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/parser.ts src/parser.test.ts
git commit -m "feat: add parser module for HTML to markdown conversion"
```

---

## Task 7: Scraper Module

**Files:**
- Create: `src/scraper.ts`

**Step 1: Implement scraper (no unit tests - integration with Playwright)**

```typescript
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
```

**Step 2: Verify module loads**

Run: `bun run -e "import './src/scraper'; console.log('OK')"`
Expected: Outputs "OK"

**Step 3: Commit**

```bash
git add src/scraper.ts
git commit -m "feat: add scraper module with Playwright integration"
```

---

## Task 8: CLI Integration

**Files:**
- Modify: `src/index.ts`

**Step 1: Implement full CLI**

```typescript
// src/index.ts
#!/usr/bin/env bun

import { Command } from "commander";
import path from "path";
import fs from "fs";
import { isValidXArticleUrl, slugify, ensureDir, uniquePath } from "./utils";
import { loadCookies, saveCookies, clearCookies } from "./auth";
import { scrapeArticle, initBrowser, closeBrowser, interactiveLogin } from "./scraper";
import { downloadMedia } from "./media";
import { generateMarkdown } from "./writer";
import type { CliOptions } from "./types";

const program = new Command();

program
  .name("x-article")
  .description("Download X Articles to markdown files")
  .version("0.1.0");

program
  .argument("[url]", "X article URL to download")
  .option("-o, --output <dir>", "Output directory", "./articles")
  .option("--include-replies", "Include reply thread from author")
  .option("--include-all-replies", "Include full conversation tree")
  .option("--no-media", "Skip downloading images/videos")
  .option("--format <fmt>", "Output format: md, json", "md")
  .option("-v, --verbose", "Show detailed progress")
  .option("--login", "Force re-authentication")
  .option("--logout", "Clear stored cookies")
  .action(async (url: string | undefined, opts) => {
    try {
      // Handle --logout
      if (opts.logout) {
        clearCookies();
        console.log("Cookies cleared.");
        return;
      }

      // Handle --login
      if (opts.login) {
        const browser = await initBrowser();
        const cookies = await interactiveLogin(browser);
        saveCookies(cookies);
        await closeBrowser();
        console.log("Login successful. Cookies saved.");
        if (!url) return;
      }

      // Require URL for download
      if (!url) {
        console.error("Error: URL is required");
        console.log("Usage: x-article <url> [options]");
        console.log("       x-article --login");
        console.log("       x-article --logout");
        process.exit(1);
      }

      // Validate URL
      if (!isValidXArticleUrl(url)) {
        console.error("Error: Not a valid X article URL");
        console.log("Expected format: https://x.com/username/article/123456");
        process.exit(1);
      }

      const options: CliOptions = {
        output: opts.output,
        includeReplies: opts.includeReplies || false,
        includeAllReplies: opts.includeAllReplies || false,
        noMedia: !opts.media, // commander inverts --no-* flags
        format: opts.format,
        verbose: opts.verbose || false,
      };

      if (options.verbose) {
        console.log("Options:", options);
      }

      // Load or get cookies
      let cookies = loadCookies();
      if (!cookies || cookies.length === 0) {
        console.log("No saved session found. Starting login...");
        const browser = await initBrowser();
        cookies = await interactiveLogin(browser);
        saveCookies(cookies);
      }

      // Scrape article
      console.log("Fetching article...");
      const article = await scrapeArticle(url, cookies, options.verbose);

      if (options.verbose) {
        console.log(`Title: ${article.metadata.title}`);
        console.log(`Author: ${article.metadata.author}`);
        console.log(`Media items: ${article.media.length}`);
      }

      // Create output directory
      const folderName = slugify(article.metadata.title) || "article";
      const baseOutputPath = path.join(options.output, folderName);
      const outputPath = uniquePath(baseOutputPath);
      ensureDir(outputPath);

      // Download media if enabled
      if (!options.noMedia && article.media.length > 0) {
        console.log(`Downloading ${article.media.length} media files...`);
        article.media = await downloadMedia(article.media, outputPath, options.verbose);
      }

      // Generate and write output
      if (options.format === "json") {
        const jsonPath = path.join(outputPath, "article.json");
        fs.writeFileSync(jsonPath, JSON.stringify(article, null, 2));
        console.log(`Saved: ${jsonPath}`);
      } else {
        const markdown = generateMarkdown(article);
        const mdPath = path.join(outputPath, "index.md");
        fs.writeFileSync(mdPath, markdown);
        console.log(`Saved: ${mdPath}`);
      }

      await closeBrowser();
      console.log("Done!");
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      await closeBrowser();
      process.exit(1);
    }
  });

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nInterrupted. Cleaning up...");
  await closeBrowser();
  process.exit(0);
});

program.parse();
```

**Step 2: Run all tests**

Run: `bun test`
Expected: All tests PASS

**Step 3: Test CLI help**

Run: `bun run src/index.ts --help`
Expected: Shows help with all options

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: implement full CLI with all options"
```

---

## Task 9: Final Verification & README

**Files:**
- Modify: `README.md`

**Step 1: Run full test suite**

Run: `bun test`
Expected: All tests PASS

**Step 2: Update README**

```markdown
# x-article-download

Download X (Twitter) Articles to markdown files with metadata and media.

## Installation

```bash
bun install
```

## Usage

```bash
# Download an article
bun run src/index.ts https://x.com/username/article/123456

# With custom output directory
bun run src/index.ts https://x.com/username/article/123456 -o ~/archive

# Skip media download
bun run src/index.ts https://x.com/username/article/123456 --no-media

# Verbose output
bun run src/index.ts https://x.com/username/article/123456 -v

# Force re-login
bun run src/index.ts --login

# Clear saved session
bun run src/index.ts --logout
```

## Options

| Option | Description |
|--------|-------------|
| `-o, --output <dir>` | Output directory (default: ./articles) |
| `--include-replies` | Include reply thread from author |
| `--include-all-replies` | Include full conversation tree |
| `--no-media` | Skip downloading images/videos |
| `--format <fmt>` | Output format: md, json (default: md) |
| `-v, --verbose` | Show detailed progress |
| `--login` | Force re-authentication |
| `--logout` | Clear stored cookies |

## Output Structure

```
articles/
└── article-title/
    ├── index.md
    └── media/
        ├── 1.jpg
        └── 2.png
```

## Authentication

On first run, a browser window opens for you to log in to X. Cookies are saved to `~/.x-article/cookies.json` for subsequent runs.

You can also set the `X_AUTH_COOKIES` environment variable with JSON-encoded cookies.

## Development

```bash
# Run tests
bun test

# Run with verbose output
bun run src/index.ts <url> -v
```
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add usage instructions to README"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Project scaffolding |
| 2 | Utils module (slugify, URL validation) |
| 3 | Auth module (cookie management) |
| 4 | Writer module (markdown generation) |
| 5 | Media module (download images/videos) |
| 6 | Parser module (HTML to markdown) |
| 7 | Scraper module (Playwright integration) |
| 8 | CLI integration |
| 9 | Final verification & README |
