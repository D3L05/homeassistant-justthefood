#!/bin/sh
set -e

CONFIG_PATH="/data/options.json"

# Read addon options
export TIMER_MODE=$(jq -r '.timer_mode' $CONFIG_PATH)
export TIMER_ENTITY=$(jq -r '.timer_entity // "timer.cooking_timer"' $CONFIG_PATH)
export NOTIFICATION_SERVICE=$(jq -r '.notification_service // empty' $CONFIG_PATH)
export TTS_ENABLED=$(jq -r '.tts_enabled' $CONFIG_PATH)
export TTS_SERVICE=$(jq -r '.tts_service // empty' $CONFIG_PATH)
export TTS_ENTITY=$(jq -r '.tts_entity // empty' $CONFIG_PATH)

# AI Configuration
export AI_ENABLED=$(jq -r '.ai_enabled' $CONFIG_PATH)
export AI_PROVIDER=$(jq -r '.ai_provider // "openai"' $CONFIG_PATH)
export AI_API_KEY=$(jq -r '.ai_api_key // empty' $CONFIG_PATH)
export AI_BASE_URL=$(jq -r '.ai_base_url // empty' $CONFIG_PATH)
export AI_MODEL=$(jq -r '.ai_model // empty' $CONFIG_PATH)

# Set database path for persistence
export DATABASE_PATH="/data/recipes.db"

# Home Assistant API access (provided by Supervisor)
export HA_SUPERVISOR_TOKEN="${SUPERVISOR_TOKEN}"
export HA_API_URL="http://supervisor/core/api"

echo "Starting JustTheFood v1.1.0..."
echo "Timer Mode: ${TIMER_MODE}"
echo "Database: ${DATABASE_PATH}"

cd /app
exec node server.js
