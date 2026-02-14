import { NextRequest, NextResponse } from 'next/server';
import { sendNotification, announceViaTTS } from '@/lib/ha-api';
import { getAddonConfig } from '@/lib/addon-config';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, title } = body;
        const config = getAddonConfig();

        if (!message) {
            return NextResponse.json(
                { error: 'Message required' },
                { status: 400 }
            );
        }

        // Send notification if service is configured
        if (config.notificationService) {
            await sendNotification(config.notificationService, message, title);
        }

        // TTS announcement if enabled
        if (config.ttsEnabled && config.ttsEntity) {
            await announceViaTTS(config.ttsService, config.ttsEntity, message);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Notification error:', error);
        return NextResponse.json(
            { error: 'Failed to send notification' },
            { status: 500 }
        );
    }
}
