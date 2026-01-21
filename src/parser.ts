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
