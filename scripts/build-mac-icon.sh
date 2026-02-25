#!/bin/sh
set -eu

SOURCE_SVG="src/assets/icon.svg"
SOURCE_PNG="src/assets/icon.png"
ICONSET_DIR="build/icon.iconset"
OUTPUT_ICON="build/icon.icns"

render_icon() {
	size="$1"
	output="$2"

	if [ -f "$SOURCE_SVG" ] && sips -z "$size" "$size" "$SOURCE_SVG" --out "$output" >/dev/null 2>&1; then
		return 0
	fi

	if [ -f "$SOURCE_PNG" ]; then
		sips -z "$size" "$size" "$SOURCE_PNG" --out "$output" >/dev/null
		return 0
	fi

	echo "No valid icon source found. Expected $SOURCE_SVG or $SOURCE_PNG"
	exit 1
}

mkdir -p "build"
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

render_icon 16 "$ICONSET_DIR/icon_16x16.png"
render_icon 32 "$ICONSET_DIR/icon_16x16@2x.png"
render_icon 32 "$ICONSET_DIR/icon_32x32.png"
render_icon 64 "$ICONSET_DIR/icon_32x32@2x.png"
render_icon 128 "$ICONSET_DIR/icon_128x128.png"
render_icon 256 "$ICONSET_DIR/icon_128x128@2x.png"
render_icon 256 "$ICONSET_DIR/icon_256x256.png"
render_icon 512 "$ICONSET_DIR/icon_256x256@2x.png"
render_icon 512 "$ICONSET_DIR/icon_512x512.png"
render_icon 1024 "$ICONSET_DIR/icon_512x512@2x.png"

iconutil -c icns "$ICONSET_DIR" -o "$OUTPUT_ICON"
