#!/bin/bash

# Component Size Checker for FamBam
# Warns when JSX/TSX files exceed 300 lines

# Read tool input from stdin
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Exit if no file path or jq failed
if [ -z "$file_path" ]; then
  exit 0
fi

# Only check JSX/TSX component files
if [[ ! $file_path =~ \.(jsx|tsx)$ ]]; then
  exit 0
fi

# Skip if file doesn't exist (was deleted)
if [ ! -f "$file_path" ]; then
  exit 0
fi

# Count lines
line_count=$(wc -l < "$file_path" | tr -d ' ')

# Warning threshold
MAX_LINES=300

if [ "$line_count" -gt "$MAX_LINES" ]; then
  echo "" >&2
  echo "================================================" >&2
  echo "  COMPONENT SIZE WARNING" >&2
  echo "================================================" >&2
  echo "" >&2
  echo "  File: $(basename "$file_path")" >&2
  echo "  Lines: $line_count (max: $MAX_LINES)" >&2
  echo "" >&2
  echo "  This component is too large!" >&2
  echo "  Consider splitting into:" >&2
  echo "    - Smaller subcomponents" >&2
  echo "    - Custom hooks for logic" >&2
  echo "    - Separate utility functions" >&2
  echo "" >&2
  echo "================================================" >&2
  exit 2  # Block and provide feedback
fi

# Optional: Soft warning at 250 lines
if [ "$line_count" -gt 250 ]; then
  echo "Note: $(basename "$file_path") has $line_count lines - approaching 300 line limit" >&2
  exit 0  # Don't block, just warn
fi

exit 0
