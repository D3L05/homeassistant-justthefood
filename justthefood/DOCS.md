# JustTheFood

Recipe manager with cooking mode, timers, and Home Assistant integration.

## How it works

1. **Extract** — Paste any recipe URL and JustTheFood extracts the clean recipe (no ads, no stories)
2. **Cook** — Follow step-by-step instructions with checkboxes to track progress
3. **Time** — Timers are auto-detected from recipe text and can start HA timer entities
4. **Save** — Build your personal cookbook, accessible from any device

## Configuration

### Timer Mode

- **`home_assistant`** — Controls an HA timer entity. Create a timer helper first:

```yaml
# configuration.yaml
timer:
  cooking_timer:
    name: Cooking Timer
    duration: "00:00:00"
```

- **`built_in`** — Uses browser-based countdown timers with audio alerts

### AI Extraction (optional)

Enable AI-powered extraction for better results on complex recipe sites. Supports OpenAI, Google Gemini, and Anthropic Claude.

1. Set `ai_enabled` to `true`
2. Choose your `ai_provider`
3. Enter your `ai_api_key`
4. Optionally set a custom `ai_base_url` and `ai_model`

### Notifications

Set `notification_service` to receive alerts when timers finish (e.g., `notify.mobile_app_your_phone`).

### TTS Announcements

Enable `tts_enabled` and configure `tts_service` and `tts_entity` to get voice announcements on your smart speakers when timers finish.

## Support

Found a bug or have a feature request? [Open an issue on GitHub](https://github.com/D3L05/homeassistant-justthefood/issues).
