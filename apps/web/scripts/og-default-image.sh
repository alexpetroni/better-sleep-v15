#!/usr/bin/env bash
# Regenerates the committed branded fallback og:image (static/og-default.png,
# 1200x630 — review M-6). Requires ImageMagick (`convert`). Night palette from
# config/sites/sleep.ts; the headline is the deck's hero line (home_hero_h1_*).
# Type is Liberation Sans: the self-hosted web font ships as woff2 only, which
# ImageMagick cannot load — the card is a static asset, not live text.
#
#   apps/web/scripts/og-default-image.sh [output.png]
set -euo pipefail
OUT="${1:-$(dirname "$0")/../static/og-default.png}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

NIGHT='#14162f'
NIGHT_DEEP='#0d0f24'
INK='#eceef8'
MUTED='#b7bcd9'
MOON='#e9cd90'
BOLD='Liberation-Sans-Bold'
REG='Liberation-Sans'

# Base: vertical night gradient with a soft indigo glow behind the moon
# (full-canvas radial, screen-blended — no seams).
convert -size 1200x630 gradient:"$NIGHT"-"$NIGHT_DEEP" "$TMP/base.png"
convert -size 1200x630 -define gradient:center=1000,150 -define gradient:radii=520,520 \
	radial-gradient:'#34305e'-'#000000' "$TMP/glow.png"
convert "$TMP/base.png" "$TMP/glow.png" -compose screen -composite "$TMP/bg.png"

# Moon: warm disc with a faint halo ring, upper right.
convert "$TMP/bg.png" \
	-fill none -stroke '#e9cd9040' -strokewidth 2 -draw "circle 1000,150 1000,268" \
	-fill "$MOON" -stroke none -draw "circle 1000,150 1000,240" \
	"$TMP/moon.png"

# Stars: fixed constellation, two brightness levels.
convert "$TMP/moon.png" \
	-fill '#ffffff' \
	-draw "circle 180,90 180,92.6" -draw "circle 420,60 420,62" -draw "circle 700,110 700,112" \
	-draw "circle 780,420 780,422" -draw "circle 1120,470 1120,472.4" -draw "circle 300,180 300,181.8" \
	-fill '#9fa4c8' \
	-draw "circle 520,150 520,151.7" -draw "circle 640,260 640,261.6" -draw "circle 1050,380 1050,381.7" \
	-draw "circle 240,320 240,321.6" -draw "circle 90,240 90,241.7" -draw "circle 1160,80 1160,82" \
	"$TMP/stars.png"

# Type: brand eyebrow, the deck's hero line, domain.
convert "$TMP/stars.png" \
	-font "$BOLD" -pointsize 30 -kerning 8 -fill "$MOON" \
	-annotate +80+130 'BETTER SLEEP' \
	-font "$BOLD" -pointsize 76 -kerning 0 -fill "$INK" \
	-annotate +80+286 'Nu dormi prost.' \
	-font "$BOLD" -pointsize 46 -fill "$MUTED" \
	-annotate +80+360 'Dormi prost dintr-un motiv anume.' \
	-font "$REG" -pointsize 28 -fill "$MUTED" \
	-annotate +80+560 'bettersleep.ro' \
	-depth 8 -strip "$OUT"
echo "Wrote $OUT"
