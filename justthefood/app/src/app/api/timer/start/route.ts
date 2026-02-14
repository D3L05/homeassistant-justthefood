import { NextRequest, NextResponse } from 'next/server';
import { startHATimer } from '@/lib/ha-api';
import { getAddonConfig } from '@/lib/addon-config';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { durationSeconds, label, stepIndex } = body;

        if (!durationSeconds || durationSeconds <= 0) {
            return NextResponse.json(
                { error: 'Invalid duration' },
                { status: 400 }
            );
        }

        const config = getAddonConfig();
        const entityId = config.timerEntity || 'timer.cooking_timer';

        // Start timer in Home Assistant
        await startHATimer(durationSeconds, entityId);

        return NextResponse.json({
            success: true,
            entity: entityId,
            duration: durationSeconds,
            label: label || 'Timer',
        });
    } catch (error) {
        console.error('Timer start error:', error);
        return NextResponse.json(
            { error: 'Failed to start timer' },
            { status: 500 }
        );
    }
}
