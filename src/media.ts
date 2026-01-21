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
