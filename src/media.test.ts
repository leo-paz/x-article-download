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
