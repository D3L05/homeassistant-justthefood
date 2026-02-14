/**
 * Home Assistant API Client
 * Uses the Supervisor API to interact with HA services
 */

interface HAConfig {
    supervisorToken: string | undefined;
    apiUrl: string;
}

function getConfig(): HAConfig {
    const token = process.env.SUPERVISOR_TOKEN || process.env.HA_SUPERVISOR_TOKEN;
    return {
        supervisorToken: token,
        apiUrl: process.env.HA_API_URL || 'http://supervisor/core/api',
    };
}

/**
 * Call a Home Assistant service
 */
export async function callService(
    domain: string,
    service: string,
    data: Record<string, unknown> = {}
): Promise<void> {
    const config = getConfig();
    const url = `${config.apiUrl}/services/${domain}/${service}`;

    console.log(`[HA API] Calling ${url}`);
    console.log(`[HA API] Token present: ${!!config.supervisorToken}, length: ${config.supervisorToken?.length || 0}`);
    console.log(`[HA API] SUPERVISOR_TOKEN env: ${!!process.env.SUPERVISOR_TOKEN}, HA_SUPERVISOR_TOKEN env: ${!!process.env.HA_SUPERVISOR_TOKEN}`);

    if (!config.supervisorToken) {
        console.warn('[HA API] No Supervisor token available - running outside HA?');
        throw new Error('No HA Supervisor token available. Make sure homeassistant_api is enabled in config.yaml.');
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.supervisorToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error(`[HA API] Call failed: ${response.status} ${response.statusText} - ${error}`);
        throw new Error(`HA service call failed: ${response.status}: ${error}`);
    }

    console.log(`[HA API] Service call successful: ${domain}.${service}`);
}

/**
 * Create a timer using Home Assistant's timer integration
 * Note: Requires a timer entity to be pre-configured in HA (e.g., timer.cooking_timer)
 */
export async function startHATimer(
    durationSeconds: number,
    entityId: string = 'timer.cooking_timer'
): Promise<void> {
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const seconds = durationSeconds % 60;

    const duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    await callService('timer', 'start', {
        entity_id: entityId,
        duration,
    });
}

/**
 * Cancel a running timer
 */
export async function cancelHATimer(entityId: string = 'timer.cooking_timer'): Promise<void> {
    await callService('timer', 'cancel', {
        entity_id: entityId,
    });
}

/**
 * Send a notification via Home Assistant
 */
export async function sendNotification(
    service: string,
    message: string,
    title?: string
): Promise<void> {
    if (!service) return;

    // Parse service like "notify.mobile_app_phone" into domain and service name
    const [domain, serviceName] = service.split('.');

    await callService(domain || 'notify', serviceName || 'notify', {
        message,
        title: title || 'JustTheFood Timer',
    });
}

/**
 * Announce via TTS
 */
export async function announceViaTTS(
    ttsService: string,
    entityId: string,
    message: string
): Promise<void> {
    if (!ttsService || !entityId) return;

    const [domain, service] = ttsService.split('.');

    await callService(domain || 'tts', service || 'speak', {
        entity_id: entityId,
        message,
    });
}

/**
 * Fire a custom event that automations can listen to
 */
export async function fireEvent(
    eventType: string,
    eventData: Record<string, unknown> = {}
): Promise<void> {
    const config = getConfig();

    if (!config.supervisorToken) {
        console.warn('No HA Supervisor token available');
        return;
    }

    const response = await fetch(`${config.apiUrl}/events/${eventType}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.supervisorToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`HA event fire failed: ${error}`);
    }
}
