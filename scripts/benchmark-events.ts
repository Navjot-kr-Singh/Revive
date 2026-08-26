/**
 * REVIVE — Event Stream Performance Benchmark
 * 
 * Benchmarks synthetic event generation, bulk ingestion, aggregation,
 * and incident detection across 10k, 50k, and 100k events.
 */

import { getDb } from '@/server/db';
import { merchants } from '@/server/db/schema';
import { runSeed } from '@/server/db/seed';
import { TransactionGenerator } from '@/server/services/synthetic-data/transaction-generator';
import { HERO_UPI_SCENARIO } from '@/server/services/synthetic-data/scenario-generator';
import { ingestEventBatch, type IngestEventInput } from '@/server/services/event-ingestion';
import { AggregationEngine } from '@/server/services/incident/aggregation-engine';
import { IncidentDetector } from '@/server/services/incident/incident-detector';
import { IncidentService } from '@/server/services/incident/incident-service';

export interface BenchmarkReport {
  targetTransactions: number;
  totalEvents: number;
  generationTimeMs: number;
  ingestTimeMs: number;
  aggregationTimeMs: number;
  detectionTimeMs: number;
  totalTimeMs: number;
  eventThroughputPerSec: number;
  anomaliesDetected: number;
  casesCreated: number;
}

export async function runBenchmark(targetTx: number = 10000): Promise<BenchmarkReport> {
  console.log(`\n⚡ Starting Benchmark for ${targetTx.toLocaleString()} transactions...`);
  
  await runSeed();
  const db = getDb();
  const [acme] = await db.select().from(merchants);

  // 1. Generation
  const t0 = performance.now();
  const txGen = new TransactionGenerator(20260826);
  const startTime = new Date(Date.now() - 60 * 60 * 1000);

  const transactions = txGen.generateStream({
    seed: 20260826,
    totalTransactions: targetTx,
    startTime,
    timeSpanMinutes: 60,
    merchantId: acme.id,
    scenario: HERO_UPI_SCENARIO,
  });

  const allEvents: IngestEventInput[] = [];
  for (const tx of transactions) {
    for (const ev of tx.events) {
      allEvents.push({
        eventId: ev.eventId,
        eventType: ev.eventType,
        source: ev.source,
        sourceEventId: ev.sourceEventId,
        merchantId: acme.id,
        payload: ev.payload,
        timestamp: ev.timestamp,
      });
    }
  }
  const t1 = performance.now();
  const generationTimeMs = Math.round(t1 - t0);

  // 2. Ingestion & Case Creation
  const t2 = performance.now();
  const ingestResult = await ingestEventBatch(allEvents, 2000);
  const t3 = performance.now();
  const ingestTimeMs = Math.round(t3 - t2);

  // 3. Aggregation
  const t4 = performance.now();
  const windowMetrics = await AggregationEngine.aggregateWindow({
    merchantId: acme.id,
    windowMinutes: 60,
    startTime,
    endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
  });
  const t5 = performance.now();
  const aggregationTimeMs = Math.round(t5 - t4);

  // 4. Detection & Incident Creation
  const t6 = performance.now();
  let anomalyCount = 0;
  for (const metric of windowMetrics) {
    const signal = IncidentDetector.evaluateWindow(metric);
    if (signal.isAnomaly) {
      anomalyCount++;
      await IncidentService.processSignal(signal);
    }
  }
  const t7 = performance.now();
  const detectionTimeMs = Math.round(t7 - t6);

  const totalTimeMs = generationTimeMs + ingestTimeMs + aggregationTimeMs + detectionTimeMs;
  const eventThroughput = Math.round((allEvents.length / (ingestTimeMs / 1000)));

  const report: BenchmarkReport = {
    targetTransactions: targetTx,
    totalEvents: allEvents.length,
    generationTimeMs,
    ingestTimeMs,
    aggregationTimeMs,
    detectionTimeMs,
    totalTimeMs,
    eventThroughputPerSec: eventThroughput,
    anomaliesDetected: anomalyCount,
    casesCreated: ingestResult.casesCreatedCount,
  };

  console.log('\n────────────────────────────────────────────────────────');
  console.log(`  BENCHMARK RESULT (${targetTx.toLocaleString()} TRANSACTIONS / ${allEvents.length.toLocaleString()} EVENTS)`);
  console.log('────────────────────────────────────────────────────────');
  console.log(`  Generation Time:       ${(generationTimeMs / 1000).toFixed(2)}s`);
  console.log(`  Bulk Ingest Time:      ${(ingestTimeMs / 1000).toFixed(2)}s`);
  console.log(`  Aggregation Time:      ${(aggregationTimeMs / 1000).toFixed(2)}s`);
  console.log(`  Detection Time:        ${(detectionTimeMs / 1000).toFixed(2)}s`);
  console.log(`  Total Pipeline Time:   ${(totalTimeMs / 1000).toFixed(2)}s`);
  console.log(`  Ingest Throughput:     ${eventThroughput.toLocaleString()} events/sec`);
  console.log(`  Cases Created:         ${report.casesCreated.toLocaleString()}`);
  console.log(`  Anomalies Detected:    ${anomalyCount}`);
  console.log('────────────────────────────────────────────────────────\n');

  return report;
}

// Allow direct execution
if (process.argv[1]?.includes('benchmark-events.ts')) {
  const count = parseInt(process.argv[2] || '10000', 10);
  runBenchmark(count)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Benchmark failed:', err);
      process.exit(1);
    });
}
