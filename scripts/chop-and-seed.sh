#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   SUPABASE_SERVICE_ROLE_KEY=... ./scripts/chop-and-seed.sh <input.mp4> [clip_duration_seconds]
# Optional env:
#   SUPABASE_URL, SUPABASE_BUCKET
#
# Chops a video into clips, uploads to Supabase Storage, and inserts metadata.

INPUT="${1:?Usage: $0 <input.mp4> [clip_duration_seconds]}"
CLIP_DURATION="${2:-45}"

SUPABASE_URL="${SUPABASE_URL:-https://zqhbjgioibiyaagjihhx.supabase.co}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
BUCKET="${SUPABASE_BUCKET:-clips}"

if [ -z "${SERVICE_ROLE_KEY}" ] && [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
  SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SERVICE_ROLE_KEY}}"
fi

if [ -z "${SERVICE_ROLE_KEY}" ]; then
  echo "Missing SUPABASE_SERVICE_ROLE_KEY. Export it or add it to .env before running this script." >&2
  exit 1
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

TOTAL_DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$INPUT" | cut -d. -f1)
echo "Video duration: ${TOTAL_DURATION}s, clip length: ${CLIP_DURATION}s"

PROBLEMS='[
  {"id":"7f02059e-ea79-4041-ad9d-17ecdd38deb9","number":1,"title":"Two Sum","difficulty":"Easy","topics":["array","hash-map"]},
  {"id":"36d78bf5-f500-4267-ac21-cdb472e91fbf","number":20,"title":"Valid Parentheses","difficulty":"Easy","topics":["string","stack"]},
  {"id":"df6cd19d-13cb-492d-b467-24888bac56d9","number":21,"title":"Merge Two Sorted Lists","difficulty":"Easy","topics":["linked-list","recursion"]},
  {"id":"7a57138a-d499-470b-ba10-02cd261a159e","number":53,"title":"Maximum Subarray","difficulty":"Medium","topics":["array","dynamic-programming"]},
  {"id":"e3c728a0-9347-499c-8ba6-421c35120763","number":70,"title":"Climbing Stairs","difficulty":"Easy","topics":["dynamic-programming","fibonacci"]},
  {"id":"ffe6b986-1b4c-4a47-9761-0ba5b2f07315","number":121,"title":"Best Time to Buy and Sell Stock","difficulty":"Easy","topics":["array","greedy"]},
  {"id":"7b93383f-0d23-4be7-9100-6e17c6047284","number":217,"title":"Contains Duplicate","difficulty":"Easy","topics":["array","hash-set"]},
  {"id":"60010b52-9678-4db0-b4d8-1887c7469800","number":226,"title":"Invert Binary Tree","difficulty":"Easy","topics":["tree","recursion"]},
  {"id":"a595ba23-bb9b-427a-831f-df6f0fae13bd","number":242,"title":"Valid Anagram","difficulty":"Easy","topics":["string","hash-map"]},
  {"id":"6bb5e4df-84aa-486f-99df-e6f273d2ea7c","number":704,"title":"Binary Search","difficulty":"Easy","topics":["array","binary-search"]}
]'

HOOKS=(
  "The classic hash map trick everyone needs to know"
  "Master the stack pattern for bracket matching"
  "Elegant pointer merging explained in 45 seconds"
  "Kadane's algorithm is simpler than you think"
  "This DP pattern shows up in every interview"
  "One pass, O(1) space -- the greedy insight"
  "Hash set vs sorting -- which is better?"
  "The most famous interview question, solved recursively"
  "Two approaches: sorting vs counting"
  "Binary search template you can use everywhere"
)

CLIP_INDEX=0
START=0

while [ "$START" -lt "$TOTAL_DURATION" ]; do
  PROBLEM_IDX=$((CLIP_INDEX % 10))
  PROBLEM_ID=$(echo "$PROBLEMS" | python3 -c "import json,sys; print(json.load(sys.stdin)[$PROBLEM_IDX]['id'])")
  PROBLEM_TITLE=$(echo "$PROBLEMS" | python3 -c "import json,sys; print(json.load(sys.stdin)[$PROBLEM_IDX]['title'])")
  CLIP_FILE="$TMPDIR/clip_${CLIP_INDEX}.mp4"
  STORAGE_PATH="mock/clip_${CLIP_INDEX}.mp4"

  echo ""
  echo "=== Clip $CLIP_INDEX: ${PROBLEM_TITLE} (start=${START}s) ==="

  # Cut the clip
  ffmpeg -y -ss "$START" -i "$INPUT" -t "$CLIP_DURATION" \
    -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k \
    -movflags +faststart "$CLIP_FILE" 2>/dev/null

  ACTUAL_DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$CLIP_FILE")

  # Upload to Supabase Storage
  echo "  Uploading ${STORAGE_PATH}..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${SUPABASE_URL}/storage/v1/object/${BUCKET}/${STORAGE_PATH}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: video/mp4" \
    -H "x-upsert: true" \
    --data-binary "@${CLIP_FILE}")

  if [ "$HTTP_CODE" != "200" ]; then
    echo "  Upload failed with HTTP ${HTTP_CODE}, retrying..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "${SUPABASE_URL}/storage/v1/object/${BUCKET}/${STORAGE_PATH}" \
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
      -H "Content-Type: video/mp4" \
      -H "x-upsert: true" \
      --data-binary "@${CLIP_FILE}")
    echo "  Retry HTTP: ${HTTP_CODE}"
  fi

  VIDEO_URL="${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${STORAGE_PATH}"
  echo "  URL: ${VIDEO_URL}"

  HOOK="${HOOKS[$PROBLEM_IDX]}"
  CLIP_TITLE="${PROBLEM_TITLE} - Quick Explanation"

  # Insert clip metadata into database
  echo "  Inserting metadata..."
  curl -s -o /dev/null \
    -X POST "${SUPABASE_URL}/rest/v1/clips" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{
      \"problem_id\": \"${PROBLEM_ID}\",
      \"video_url\": \"${VIDEO_URL}\",
      \"title\": \"${CLIP_TITLE}\",
      \"duration\": ${ACTUAL_DURATION},
      \"creator\": \"NeetCode\",
      \"hook\": \"${HOOK}\"
    }"

  echo "  Done: ${CLIP_TITLE} (${ACTUAL_DURATION}s)"

  START=$((START + CLIP_DURATION))
  CLIP_INDEX=$((CLIP_INDEX + 1))
done

echo ""
echo "=== Complete: ${CLIP_INDEX} clips created and uploaded ==="
echo "Clips are live at: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/mock/"
