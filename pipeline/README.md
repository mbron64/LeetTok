# LeetTok Pipeline

Standalone Python pipeline that discovers NeetCode YouTube videos, detects viral-worthy segments, extracts clips, and prepares them for publishing as short-form content.

## Prerequisites

- **Python 3.11+**
- **FFmpeg** must be installed and available on `PATH`
  ```bash
  # macOS
  brew install ffmpeg
  # Ubuntu/Debian
  sudo apt install ffmpeg
  ```

## Setup

```bash
cd pipeline

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Or install as an editable package
pip install -e .
```

## Configuration

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key for GPT calls |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude calls |
| `YOUTUBE_API_KEY` | Google/YouTube Data API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase service-role key |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY` | R2 access key ID |
| `R2_SECRET_KEY` | R2 secret access key |
| `R2_BUCKET` | R2 bucket name |

## Usage

```bash
# Run via module
python -m pipeline <command>

# Or if installed as a package
leettok <command>
```

### Commands

| Command | Description |
|---|---|
| `discover` | Find new videos from NeetCode's channel |
| `process <youtube_url>` | Run the full pipeline on a single video |
| `batch` | Discover + process all new videos |
| `review <video_id>` | Review detected segments for a video |

### Examples

```bash
python -m pipeline discover
python -m pipeline process "https://www.youtube.com/watch?v=abc123"
python -m pipeline batch
python -m pipeline review abc123
```
