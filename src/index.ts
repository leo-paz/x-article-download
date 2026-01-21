#!/usr/bin/env bun
// src/index.ts

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
  .option("--cookies-file <path>", "Import cookies from JSON file (bypasses interactive login)")
  .option("--export-cookies-help", "Show instructions for exporting cookies from browser")
  .action(async (url: string | undefined, opts) => {
    try {
      // Handle --export-cookies-help
      if (opts.exportCookiesHelp) {
        console.log(`
How to export cookies from your browser:

Option 1: Using Chrome DevTools
1. Log in to x.com in your regular Chrome browser
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to Application tab → Cookies → https://x.com
4. Copy the cookies you need (especially 'auth_token', 'ct0', 'twid')
5. Create a JSON file with this format:
   [
     {"name": "auth_token", "value": "YOUR_VALUE", "domain": ".x.com", "path": "/"},
     {"name": "ct0", "value": "YOUR_VALUE", "domain": ".x.com", "path": "/"},
     {"name": "twid", "value": "YOUR_VALUE", "domain": ".x.com", "path": "/"}
   ]
6. Run: x-article --cookies-file cookies.json <url>

Option 2: Using a browser extension
1. Install "EditThisCookie" or "Cookie-Editor" extension
2. Log in to x.com
3. Click the extension and export cookies as JSON
4. Save to a file and run: x-article --cookies-file cookies.json <url>

Option 3: Using browser console
1. Log in to x.com in your browser
2. Open DevTools Console (F12)
3. Run: copy(document.cookie.split(';').map(c => {
     const [name, value] = c.trim().split('=');
     return {name, value, domain: '.x.com', path: '/'};
   }))
4. Paste into a JSON file and use with --cookies-file
`);
        return;
      }

      // Handle --logout
      if (opts.logout) {
        clearCookies();
        console.log("Cookies cleared.");
        return;
      }

      // Handle --cookies-file (import cookies from file)
      if (opts.cookiesFile) {
        try {
          const cookiesJson = fs.readFileSync(opts.cookiesFile, "utf-8");
          const importedCookies = JSON.parse(cookiesJson);
          saveCookies(importedCookies);
          console.log(`Imported ${importedCookies.length} cookies from ${opts.cookiesFile}`);
        } catch (err) {
          console.error(`Error reading cookies file: ${err instanceof Error ? err.message : err}`);
          process.exit(1);
        }
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

      // Require URL for download (unless just importing cookies)
      if (!url && !opts.cookiesFile) {
        console.error("Error: URL is required");
        console.log("Usage: x-article <url> [options]");
        console.log("       x-article --login");
        console.log("       x-article --logout");
        console.log("       x-article --cookies-file <path>");
        console.log("       x-article --export-cookies-help");
        process.exit(1);
      }

      // If only importing cookies without URL, we're done
      if (!url && opts.cookiesFile) {
        return;
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
