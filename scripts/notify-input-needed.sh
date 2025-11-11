#!/bin/bash
# scripts/notify-input-needed.sh
# Plays one of several notification sounds randomly for variety

SOUNDS=("Basso" "Glass" "Ping" "Tink" "Purr")
RANDOM_SOUND=${SOUNDS[$RANDOM % ${#SOUNDS[@]}]}

terminal-notifier \
  -message 'Claude Code Needs Your Input' \
  -title 'Claude Code' \
  -sound "$RANDOM_SOUND" \
  -group 'claude-code' \
  -activate 'com.apple.Terminal'
