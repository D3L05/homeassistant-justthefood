import { NextRequest, NextResponse } from 'next/server';
import { getAddonConfig } from '@/lib/addon-config';

export async function GET() {
    const config = getAddonConfig();
    return NextResponse.json(config);
}
