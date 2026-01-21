# x-article-download

Download X (Twitter) Articles to markdown files with metadata and media.

## Installation

```bash
bun install
```

## Usage

```bash
# Download an article
bun run src/index.ts https://x.com/username/article/123456

# With custom output directory
bun run src/index.ts https://x.com/username/article/123456 -o ~/archive

# Skip media download
bun run src/index.ts https://x.com/username/article/123456 --no-media

# Verbose output
bun run src/index.ts https://x.com/username/article/123456 -v

# Force re-login
bun run src/index.ts --login

# Clear saved session
bun run src/index.ts --logout
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

## Output Structure

```
articles/
└── article-title/
    ├── index.md
    └── media/
        ├── 1.jpg
        └── 2.png
```

## Authentication

On first run, a browser window opens for you to log in to X. Cookies are saved to `~/.x-article/cookies.json` for subsequent runs.

You can also set the `X_AUTH_COOKIES` environment variable with JSON-encoded cookies.

## Development

```bash
# Run tests
bun test

# Run with verbose output
bun run src/index.ts <url> -v
```
