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
