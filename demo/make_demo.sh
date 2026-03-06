#!/usr/bin/env bash
# =============================================================================
# Batak Demo Video Builder
# Portrait (9:16) clips -> Landscape canvas (1920x1080) with blurred background
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# --- Configuration -----------------------------------------------------------
OUTPUT="demo_final.mp4"
CRF=18          # Quality: lower = better (18 is near-lossless)
PRESET="fast"   # Encoding speed/compression tradeoff

# --- Helpers -----------------------------------------------------------------
die() { echo "ERROR: $*" >&2; exit 1; }

require_ffmpeg() {
  command -v ffmpeg  >/dev/null 2>&1 || die "ffmpeg not found. Install with: brew install ffmpeg"
  command -v ffprobe >/dev/null 2>&1 || die "ffprobe not found (usually bundled with ffmpeg)"
}

get_orientation() {
  local file="$1"
  local width height
  width=$(ffprobe -v error -select_streams v:0 \
    -show_entries stream=width -of csv=p=0 "$file" 2>/dev/null)
  height=$(ffprobe -v error -select_streams v:0 \
    -show_entries stream=height -of csv=p=0 "$file" 2>/dev/null)
  if [ "$width" -gt "$height" ]; then
    echo "landscape"
  else
    echo "portrait"
  fi
}

# Convert portrait clip -> 1920x1080 with blurred background fill
portrait_to_landscape() {
  local input="$1"
  local output="$2"
  echo "  [portrait->landscape] $input -> $output"
  ffmpeg -y -i "$input" -filter_complex \
    "[0:v]scale=1920:1080,boxblur=40:40[bg];\
[0:v]scale=-1:1080[fg];\
[bg][fg]overlay=(W-w)/2:0[v]" \
    -map "[v]" -map "0:a?" \
    -c:v libx264 -crf "$CRF" -preset "$PRESET" \
    -c:a aac -b:a 192k \
    "$output"
}

# Scale landscape clip to 1920x1080 (pad if needed to keep aspect ratio)
landscape_to_1080() {
  local input="$1"
  local output="$2"
  echo "  [landscape->1080p  ] $input -> $output"
  ffmpeg -y -i "$input" \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
    -map "0:v" -map "0:a?" \
    -c:v libx264 -crf "$CRF" -preset "$PRESET" \
    -c:a aac -b:a 192k \
    "$output"
}

# Trim a clip: trim <input> <output> [start_sec] [duration_sec]
trim_clip() {
  local input="$1"
  local output="$2"
  local start="${3:-0}"
  local duration="${4:-}"
  local args=(-y -i "$input" -ss "$start")
  [ -n "$duration" ] && args+=(-t "$duration")
  args+=(-c copy "$output")
  echo "  [trim              ] $input (ss=$start, t=${duration:-full}) -> $output"
  ffmpeg "${args[@]}"
}

# --- Usage -------------------------------------------------------------------
usage() {
  cat <<EOF
Usage: $0 <command> [args]

Commands:
  convert <input.mp4> [output.mp4]
      Auto-detect orientation and convert to 1920x1080.
      Output defaults to ls_<input>.mp4

  trim <input.mp4> <output.mp4> [start_sec] [duration_sec]
      Trim a clip (stream copy, no re-encode).

  build [clip1.mp4 clip2.mp4 ...]
      Convert all listed clips (auto-detect orientation) then concatenate.
      If no clips given, reads from clips.txt (one filename per line).

  concat <clip1.mp4> [clip2.mp4 ...]
      Concatenate already-converted 1920x1080 clips into $OUTPUT.

  verify [file.mp4]
      Print resolution and duration of a file (default: $OUTPUT).

Examples:
  # Convert a single portrait clip
  $0 convert acilis.mp4

  # Trim then convert
  $0 trim raw_gameplay.mp4 gameplay_trimmed.mp4 5 30
  $0 convert gameplay_trimmed.mp4

  # Full pipeline from a list
  $0 build acilis.mp4 cuzdan.mp4 gameplay.mp4 skr.mp4 nft.mp4

  # Verify final output
  $0 verify

EOF
  exit 0
}

# --- Commands ----------------------------------------------------------------
cmd_convert() {
  local input="$1"
  local output="${2:-ls_$(basename "$input")}"
  [ -f "$input" ] || die "File not found: $input"
  local orient
  orient=$(get_orientation "$input")
  echo "Orientation detected: $orient"
  if [ "$orient" = "portrait" ]; then
    portrait_to_landscape "$input" "$output"
  else
    landscape_to_1080 "$input" "$output"
  fi
  echo "Done: $output"
}

cmd_trim() {
  local input="$1"
  local output="$2"
  [ -f "$input" ] || die "File not found: $input"
  trim_clip "$input" "$output" "${3:-0}" "${4:-}"
  echo "Done: $output"
}

cmd_build() {
  local clips=("$@")

  # If no clips provided, read from clips.txt
  if [ ${#clips[@]} -eq 0 ]; then
    [ -f "clips.txt" ] || die "No clips given and clips.txt not found."
    mapfile -t clips < clips.txt
  fi

  echo "=== Step 1: Convert ${#clips[@]} clips to 1920x1080 ==="
  local converted=()
  for clip in "${clips[@]}"; do
    [ -z "$clip" ] && continue
    [ -f "$clip" ] || die "File not found: $clip"
    local out="ls_$(basename "$clip")"
    cmd_convert "$clip" "$out"
    converted+=("$out")
  done

  echo ""
  echo "=== Step 2: Concatenate ==="
  cmd_concat "${converted[@]}"
}

cmd_concat() {
  local clips=("$@")
  [ ${#clips[@]} -eq 0 ] && die "No clips to concatenate."

  local listfile
  listfile=$(mktemp /tmp/concat_XXXXXX.txt)
  trap 'rm -f "$listfile"' EXIT

  for clip in "${clips[@]}"; do
    [ -f "$clip" ] || die "File not found: $clip"
    echo "file '$(realpath "$clip")'" >> "$listfile"
  done

  echo "Concatenating ${#clips[@]} clips -> $OUTPUT"
  cat "$listfile"
  ffmpeg -y -f concat -safe 0 -i "$listfile" -c copy "$OUTPUT"
  echo ""
  echo "Done: $OUTPUT"
  cmd_verify "$OUTPUT"
}

cmd_verify() {
  local file="${1:-$OUTPUT}"
  [ -f "$file" ] || die "File not found: $file"
  echo "=== Verification: $file ==="
  local info
  info=$(ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height,r_frame_rate \
    -show_entries format=duration \
    -of default=noprint_wrappers=1 "$file" 2>/dev/null)
  echo "$info"

  local w h
  w=$(echo "$info" | grep "^width=" | cut -d= -f2)
  h=$(echo "$info" | grep "^height=" | cut -d= -f2)
  if [ "$w" = "1920" ] && [ "$h" = "1080" ]; then
    echo "OK Resolution: ${w}x${h}"
  else
    echo "FAIL Resolution: ${w}x${h} (expected 1920x1080)"
  fi
}

# --- Main --------------------------------------------------------------------
require_ffmpeg

[ $# -eq 0 ] && usage

COMMAND="$1"
shift

case "$COMMAND" in
  convert) cmd_convert "$@" ;;
  trim)    cmd_trim    "$@" ;;
  build)   cmd_build   "$@" ;;
  concat)  cmd_concat  "$@" ;;
  verify)  cmd_verify  "$@" ;;
  help|--help|-h) usage ;;
  *) die "Unknown command: $COMMAND. Run '$0 help' for usage." ;;
esac
