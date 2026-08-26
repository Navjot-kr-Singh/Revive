import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Simple health check endpoint — no auth required.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'revive',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
}
