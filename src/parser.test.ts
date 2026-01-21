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
