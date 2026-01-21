# X Article Downloader - Design

## Overview

A CLI tool to download X (Twitter) Articles to markdown files with metadata and media.

## CLI Interface

```
x-article <url> [options]

Arguments:
  url                    X article URL to download

Options:
  -o, --output <dir>     Output directory (default: ./articles)
  --include-replies      Include reply thread from author
  --include-all-replies  Include full conversation tree
  --no-media            Skip downloading images/videos
  --format <fmt>        Output format: md, json (default: md)
  -v, --verbose         Show detailed progress
  -h, --help            Show help
```

Example usage:

```bash
# Basic download
x-article https://x.com/user/article/123

# With author's thread replies
x-article https://x.com/user/article/123 --include-replies

# Custom output directory
x-article https://x.com/user/article/123 -o ~/archive
```

## Output Structure

For an article titled "Why TypeScript Won":

```
articles/
└── why-typescript-won/
    ├── index.md
    └── media/
        ├── 1.png
        ├── 2.jpg
        └── video-1.mp4
```

The markdown file (`index.md`):

```markdown
---
title: Why TypeScript Won
author: username
author_url: https://x.com/username
date: 2025-01-15T10:30:00Z
url: https://x.com/username/article/123456
likes: 1234
reposts: 567
downloaded_at: 2025-01-21T14:22:00Z
---

# Why TypeScript Won

Article body content here with **formatting** preserved.

![Image description](./media/1.png)

More content...

Embedded video: [video-1.mp4](./media/video-1.mp4)
```

## Authentication Flow

```
1. Check X_AUTH_COOKIES env var
   ├── Found? → Use cookies
   └── Not found? ↓

2. Check ~/.x-article/cookies.json
   ├── Found & valid? → Use cookies
   └── Not found or expired? ↓

3. Launch visible browser
   ├── User logs in manually
   ├── Save cookies to ~/.x-article/cookies.json
   └── Continue with download
```

Additional auth commands:
- `x-article --login` to force re-authentication
- `x-article --logout` to clear stored cookies

## Project Structure

```
x-article-download/
├── src/
│   ├── index.ts        # Entry point, CLI parsing
│   ├── auth.ts         # Cookie management, login flow
│   ├── scraper.ts      # Playwright browser control
│   ├── parser.ts       # Extract content, metadata, media URLs
│   ├── media.ts        # Download images/videos
│   ├── writer.ts       # Generate markdown with frontmatter
│   └── utils.ts        # Slugify, path helpers
├── package.json
├── tsconfig.json
├── bunfig.toml         # Bun config (if needed)
└── README.md
```

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   CLI        │────▶│   Scraper    │────▶│   Writer     │
│   (args)     │     │   (Playwright)│     │   (markdown) │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Media      │
                     │   Downloader │
                     └──────────────┘
```

**Scraping strategy:**
1. Navigate to article URL with cookies
2. Wait for article content to render (detect specific selectors)
3. Extract structured data: title, body HTML, author, date, media
4. Convert HTML body to markdown (using turndown)
5. Queue media downloads in parallel
6. Write final markdown with local media paths

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid URL | Exit with error: "Not a valid X article URL" |
| Auth expired mid-session | Prompt to re-login, retry automatically |
| Article not found / deleted | Exit with error, suggest checking URL |
| Rate limited | Wait and retry with exponential backoff (3 attempts) |
| Media download fails | Warn but continue, note missing media in markdown |
| Network timeout | Retry up to 3 times, then fail with clear message |
| Output folder exists | Append `-1`, `-2` etc. to folder name |
| User cancels (Ctrl+C) | Clean up partial downloads, exit gracefully |

**Logging:**
- Default: Progress bar + final summary
- `--verbose`: Detailed step-by-step output
- Errors always shown in red with actionable guidance

## Dependencies

```json
{
  "dependencies": {
    "playwright": "^1.40.0",
    "turndown": "^7.1.0",
    "commander": "^12.0.0",
    "yaml": "^2.3.0"
  },
  "devDependencies": {
    "@types/turndown": "^5.0.0",
    "typescript": "^5.3.0"
  }
}
```

| Package | Purpose |
|---------|---------|
| `playwright` | Headless browser for scraping |
| `turndown` | Convert HTML → Markdown |
| `commander` | CLI argument parsing |
| `yaml` | Generate frontmatter |
