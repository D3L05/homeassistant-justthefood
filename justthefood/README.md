# JustTheFood Home Assistant Addon

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2FD3L05%2Fhomeassistant-justthefood)

Recipe manager with cooking mode, timers, and Home Assistant integration.

## Features

- 🍽️ **Recipe Extraction** — Paste any URL and extract a clean recipe (no ads, no life stories)
- 👨‍🍳 **Cooking Mode** — Step-by-step instructions with checkboxes
- ⏱️ **Smart Timers** — Auto-detected from recipe text (e.g., "bake for 25 minutes")
  - Home Assistant timer entities with notifications & TTS
  - Built-in countdown timers with audio alerts
- 📖 **Save Recipes** — Build your personal cookbook
- 🤖 **AI Extraction** — Optional AI-powered extraction (OpenAI, Gemini, Claude)

## Installation

1. Click the badge above, or manually add this repository URL in Home Assistant:
   ```
   https://github.com/D3L05/homeassistant-justthefood
   ```
2. Install **JustTheFood** from the Add-on Store
3. Configure timer mode and notifications (optional)
4. Start the addon — it appears in your sidebar as "Recipes"

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `timer_mode` | `home_assistant` or `built_in` | `home_assistant` |
| `timer_entity` | HA timer entity to control | `timer.cooking_timer` |
| `notification_service` | Service for timer alerts | _(empty)_ |
| `tts_enabled` | Enable voice announcements | `false` |
| `tts_service` | TTS service to use | `tts.google_translate_say` |
| `tts_entity` | Speaker for announcements | _(empty)_ |
| `ai_enabled` | Enable AI-powered extraction | `false` |
| `ai_provider` | AI provider (`openai`, `gemini`, `claude`) | `openai` |
| `ai_api_key` | API key for AI provider | _(empty)_ |

### Using Home Assistant Timers

Create a timer helper in your HA config:

```yaml
# configuration.yaml
timer:
  cooking_timer:
    name: Cooking Timer
    duration: "00:00:00"
```

The addon will control this timer when you click timer buttons in recipes.

## Support

- 🐛 [Report a bug](https://github.com/D3L05/homeassistant-justthefood/issues)
- 💡 [Request a feature](https://github.com/D3L05/homeassistant-justthefood/issues)
