/**
 * REVIVE — Hero Incident Demo Command
 * 
 * Re-seeds database, generates baseline traffic, injects HDFC Bank UPI degradation,
 * runs the anomaly detector, creates the systemic incident, links cases, and prints
 * the verified telemetry for dashboard inspection.
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
import { formatMoney } from '@/lib/money';

async function runDemoIncident() {
  console.log('\n======================================================');
  console.log('  REVIVE — HERO INCIDENT DEMO: HDFC UPI DEGRADATION   ');
  console.log('======================================================\n');

  // 1. Clean & Seed
  console.log('1️⃣  Resetting demo environment...');
  await runSeed();
  const db = getDb();
  const [acme] = await db.select().from(merchants);
  console.log(`   Merchant: ${acme.name} (${acme.id})`);

  // 2. Generate Synthetic Transaction Stream with Hero Scenario
  console.log('\n2️⃣  Generating synthetic stream with HDFC UPI degradation scenario...');
  const txGen = new TransactionGenerator(20260826);
  const startTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

  const transactions = txGen.generateStream({
    seed: 20260826,
    totalTransactions: 5000,
    startTime,
    timeSpanMinutes: 60,
    merchantId: acme.id,
    scenario: HERO_UPI_SCENARIO,
  });

  console.log(`   Generated: ${transactions.length} transactions across 60-minute window`);

  // Flatten events for batch ingestion
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

  // 3. Ingest Events
  console.log(`\n3️⃣  Bulk ingesting ${allEvents.length} events into transaction pipeline...`);
  const ingestStart = Date.now();
  const ingestResult = await ingestEventBatch(allEvents, 1000);
  const ingestDuration = ((Date.now() - ingestStart) / 1000).toFixed(2);

  console.log(`   Ingested: ${ingestResult.newEventsCount} events in ${ingestDuration}s (${ingestResult.casesCreatedCount} failure cases created)`);

  // 4. Run Aggregation Engine across the 60m window
  console.log('\n4️⃣  Running Aggregation Engine over sliding time window...');
  const windowMetrics = await AggregationEngine.aggregateWindow({
    merchantId: acme.id,
    windowMinutes: 60,
    startTime,
    endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
  });

  console.log(`   Aggregated ${windowMetrics.length} dimensional slices`);

  // 5. Run Anomaly Detector
  console.log('\n5️⃣  Evaluating statistical degradation anomalies...');
  let heroIncidentId: string | null = null;

  for (const metric of windowMetrics) {
    const signal = IncidentDetector.evaluateWindow(metric);
    if (signal.isAnomaly) {
      console.log(`   🚨 ANOMALY DETECTED: [${signal.dimension}]`);
      console.log(`      • Baseline Failure Rate: ${(signal.baselineValue * 100).toFixed(1)}%`);
      console.log(`      • Observed Failure Rate: ${(signal.observedValue * 100).toFixed(1)}% (${signal.relativeChange}x baseline)`);
      console.log(`      • Revenue At Risk: ${formatMoney(signal.revenueAtRiskMinor, 'INR')}`);
      console.log(`      • Severity: ${signal.severity.toUpperCase()} (Confidence: ${(signal.confidence * 100).toFixed(0)}%)`);

      const result = await IncidentService.processSignal(signal);
      if (signal.bank === 'HDFC Bank' && signal.paymentMethod === 'upi') {
        heroIncidentId = result.incidentId;
      }
      console.log(`      • Linked to Incident ID: ${result.incidentId} (${result.linkedCasesCount} cases linked)`);
    }
  }

  // 6. Verification Summary
  if (heroIncidentId) {
    const incidentData = await IncidentService.getIncidentById(acme.id, heroIncidentId);
    console.log('\n======================================================');
    console.log('  ✅ HERO INCIDENT CREATED & VERIFIED SUCCESSFULLY   ');
    console.log('======================================================');
    console.log(`  Incident ID:        ${incidentData?.id}`);
    console.log(`  Title:              ${incidentData?.title}`);
    console.log(`  Severity:           ${incidentData?.severity.toUpperCase()}`);
    console.log(`  Status:             ${incidentData?.status.toUpperCase()}`);
    console.log(`  Revenue At Risk:    ${formatMoney(incidentData?.revenueAtRiskMinor || 0, 'INR')}`);
    console.log(`  Affected Volume:    ${incidentData?.affectedTransactionCount} transactions`);
    console.log(`  Inspect in UI:      http://localhost:3001/dashboard/incidents/${incidentData?.id}`);
    console.log('======================================================\n');
  } else {
    console.error('❌ Expected anomaly was not detected.');
  }
}

runDemoIncident()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Demo failed:', err);
    process.exit(1);
  });
