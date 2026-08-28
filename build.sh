#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
output="$project_dir/fusion-reader-for-zotero.xpi"

cd "$project_dir"
rm -f "$output"
zip -q -r "$output" manifest.json bootstrap.js fusion-reader.js prefs.js icons
echo "Built $output"
