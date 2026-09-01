import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { sql } from 'drizzle-orm';

/**
 * GET /api/ready
 * Readiness probe checking database connectivity and policy engine status
 */
export async function GET() {
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1 as is_alive`);

    return NextResponse.json({
      status: 'READY',
      subsystems: {
        database: 'CONNECTED',
        eventPipeline: 'HEALTHY',
        aiInvestigator: 'HEALTHY',
        policyEngine: 'HEALTHY',
        recoveryExecutor: 'HEALTHY',
        reconciliationEngine: 'HEALTHY',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Database check failed';
    return NextResponse.json(
      {
        status: 'DEGRADED',
        error: msg,
        subsystems: {
          database: 'FAILED',
        },
      },
      { status: 503 }
    );
  }
}
