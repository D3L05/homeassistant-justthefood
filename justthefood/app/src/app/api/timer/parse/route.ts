import { NextResponse } from 'next/server';
import { parseTimersWithAI } from '@/lib/timer-parser';

export async function POST(request: Request) {
    try {
        const { instruction } = await request.json();

        if (!instruction || typeof instruction !== 'string') {
            return NextResponse.json(
                { error: 'Missing instruction text' },
                { status: 400 }
            );
        }

        const timers = await parseTimersWithAI(instruction);

        return NextResponse.json({ timers });
    } catch (error) {
        console.error('Timer parse error:', error);
        return NextResponse.json(
            { error: 'Failed to parse timers' },
            { status: 500 }
        );
    }
}
