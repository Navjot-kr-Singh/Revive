import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Liveness probe for Kubernetes / Container orchestrators
 */
export async function GET() {
  const uptime = process.uptime();
  const memory = process.memoryUsage();

  return NextResponse.json({
    status: 'HEALTHY',
    service: 'REVIVE Control Plane',
    version: 'v4.1.0',
    uptimeSeconds: Math.floor(uptime),
    memory: {
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      rssMb: Math.round(memory.rss / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  });
}
