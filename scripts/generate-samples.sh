#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SAMPLE_DIR="$PROJECT_DIR/apps/playground/public/samples"
TEMP_FILE="$SAMPLE_DIR/.sample-source.mp4"

mkdir -p "$SAMPLE_DIR"
rm -f \
  "$SAMPLE_DIR"/live-*.ts \
  "$SAMPLE_DIR/live.m3u8" \
  "$SAMPLE_DIR/sample.ts" \
  "$SAMPLE_DIR/sample.flv" \
  "$SAMPLE_DIR/sample.h264"

ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "testsrc2=size=640x360:rate=25" \
  -f lavfi -i "sine=frequency=440:sample_rate=48000" \
  -t 6 \
  -c:v libx264 -preset veryfast -tune zerolatency -pix_fmt yuv420p \
  -b:v 700k -maxrate 700k -bufsize 1400k \
  -g 25 -keyint_min 25 -sc_threshold 0 \
  -c:a aac -b:a 64k \
  "$TEMP_FILE"

ffmpeg -hide_banner -loglevel error -y -i "$TEMP_FILE" -c copy \
  -hls_time 1 -hls_list_size 0 -hls_segment_filename "$SAMPLE_DIR/live-%03d.ts" \
  "$SAMPLE_DIR/live.m3u8"
ffmpeg -hide_banner -loglevel error -y -i "$TEMP_FILE" -c copy -f mpegts "$SAMPLE_DIR/sample.ts"
ffmpeg -hide_banner -loglevel error -y -i "$TEMP_FILE" -c copy -f flv "$SAMPLE_DIR/sample.flv"
ffmpeg -hide_banner -loglevel error -y -i "$TEMP_FILE" -an -c:v copy -bsf:v h264_mp4toannexb -f h264 "$SAMPLE_DIR/sample.h264"

rm -f "$TEMP_FILE"
echo "Generated browser samples in $SAMPLE_DIR"
