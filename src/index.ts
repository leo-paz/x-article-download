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
