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
