# clipmd

Clip web content to clean markdown files with metadata and media.

## Installation

```bash
# Run directly with bunx
bunx clipmd <url>

# Or install globally
bun add -g clipmd
```

## Usage

```bash
# Clip an article
bunx clipmd https://x.com/username/article/123456

# Also works with status URLs
bunx clipmd https://x.com/username/status/123456

# With custom output directory
bunx clipmd https://x.com/username/article/123456 -o ~/archive

# Skip media download
bunx clipmd https://x.com/username/article/123456 --no-media

# Verbose output
bunx clipmd https://x.com/username/article/123456 -v

# Output as JSON instead of markdown
bunx clipmd https://x.com/username/article/123456 --format json
```

## Options

| Option | Description |
|--------|-------------|
| `-o, --output <dir>` | Output directory (default: ./articles) |
| `--include-replies` | Include reply thread from author |
| `--include-all-replies` | Include full conversation tree |
| `--no-media` | Skip downloading images/videos |
| `--format <fmt>` | Output format: md, json (default: md) |
| `-v, --verbose` | Show detailed progress |
| `--login` | Force re-authentication |
| `--logout` | Clear stored cookies |
| `--cookies-file <path>` | Import cookies from JSON file |
| `--export-cookies-help` | Show instructions for exporting cookies |

## Output Structure

```
articles/
└── article-title/
    ├── index.md
    └── media/
        ├── 1.jpg
        └── 2.png
```

The markdown file includes YAML frontmatter with metadata:

```yaml
---
title: "Article Title"
author: username
author_url: https://x.com/username
date: 2025-01-21T12:00:00.000Z
url: https://x.com/username/article/123456
downloaded_at: 2025-01-21T12:00:00.000Z
---
```

## Authentication

X.com requires authentication to access articles. There are several ways to authenticate:

### Option 1: Manual Cookie Import (Recommended)

X.com blocks automated logins, so the most reliable method is to manually export cookies from your browser:

1. Log in to x.com in your regular browser
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to **Application** tab → **Cookies** → **https://x.com**
4. Create a `cookies.json` file with these cookies:
   ```json
   [
     {"name": "auth_token", "value": "YOUR_VALUE", "domain": ".x.com", "path": "/"},
     {"name": "ct0", "value": "YOUR_VALUE", "domain": ".x.com", "path": "/"}
   ]
   ```
5. Import the cookies:
   ```bash
   bunx clipmd --cookies-file cookies.json
   ```

**Tip:** Use a browser extension like "Cookie-Editor" or "EditThisCookie" to export all cookies as JSON directly.

### Option 2: Interactive Login

On first run without cookies, a browser window opens for you to log in:

```bash
bunx clipmd --login
```

**Note:** X.com may block automated browser logins. If you see "Could not log you in now", use the manual cookie import method instead.

### Cookie Storage

Cookies are saved to `~/.clipmd/cookies.json` after successful authentication and reused for subsequent runs.

To clear saved cookies:
```bash
bunx clipmd --logout
```

## Development

```bash
# Clone the repo
git clone https://github.com/leo-paz/clipmd.git
cd clipmd

# Install dependencies
bun install

# Run tests
bun test

# Run locally
bun run src/index.ts <url> -v
```

## License

MIT
