// src/parser.ts
import TurndownService from "turndown";
import type { MediaItem, Article, ArticleMetadata } from "./types";

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

// Decode HTML entities in URLs
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function htmlToMarkdown(html: string): string {
  let markdown = turndownService.turndown(html);

  // Clean up common artifacts from X's HTML
  markdown = markdown
    // Remove empty links like [](/path) or [\n](/path)
    .replace(/\[\s*\]\([^)]+\)/g, "")
    // Remove links that only contain whitespace/newlines
    .replace(/\[\s+\]\([^)]+\)/g, "")
    // Remove standalone brackets
    .replace(/^\[\s*$/gm, "")
    .replace(/^\]\s*$/gm, "")
    // Remove lines that are just relative paths like ](/akoratana)
    .replace(/^\]\([^)]+\)\s*$/gm, "")
    // Remove lines that are just "!" (broken image syntax)
    .replace(/^!\s*$/gm, "")
    // Fix headings with empty ## followed by actual heading on next line
    .replace(/^(#{1,6})\s*\n\n([A-Z])/gm, "$1 $2")
    // Clean up multiple consecutive blank lines
    .replace(/\n{3,}/g, "\n\n")
    // Remove lines that are just numbers (engagement metrics)
    .replace(/^\d+(\.\d+)?[KMB]?\s*$/gm, "")
    // Trim
    .trim();

  return markdown;
}

export function extractMediaUrls(html: string): MediaItem[] {
  const media: MediaItem[] = [];

  // Extract images
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    media.push({
      url: decodeHtmlEntities(match[1]),
      type: "image",
      alt: match[2] || undefined,
    });
  }

  // Extract videos
  const videoRegex = /<video[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = videoRegex.exec(html)) !== null) {
    media.push({
      url: decodeHtmlEntities(match[1]),
      type: "video",
    });
  }

  // Also check for source tags inside video elements
  const sourceRegex = /<source[^>]+src=["']([^"']+)["'][^>]*type=["']video\/[^"']+["'][^>]*>/gi;
  while ((match = sourceRegex.exec(html)) !== null) {
    const decodedUrl = decodeHtmlEntities(match[1]);
    // Avoid duplicates
    if (!media.some((m) => m.url === decodedUrl)) {
      media.push({
        url: decodedUrl,
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
