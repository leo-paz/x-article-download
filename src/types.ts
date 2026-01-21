// src/types.ts

export interface ArticleMetadata {
  title: string;
  author: string;
  authorUrl: string;
  date: string;
  url: string;
  likes?: number;
  reposts?: number;
}

export interface MediaItem {
  url: string;
  type: "image" | "video";
  alt?: string;
  localPath?: string;
}

export interface Article {
  metadata: ArticleMetadata;
  content: string;
  media: MediaItem[];
}

export interface CliOptions {
  output: string;
  includeReplies: boolean;
  includeAllReplies: boolean;
  noMedia: boolean;
  format: "md" | "json";
  verbose: boolean;
}
