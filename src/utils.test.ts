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

  test("accepts valid x.com status URL", () => {
    expect(isValidXArticleUrl("https://x.com/user/status/123")).toBe(true);
  });

  test("rejects profile URLs", () => {
    expect(isValidXArticleUrl("https://x.com/user")).toBe(false);
  });

  test("rejects invalid domains", () => {
    expect(isValidXArticleUrl("https://example.com/article/123")).toBe(false);
  });
});
