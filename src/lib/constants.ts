/**
 * REVIVE — Application Constants
 */

// ─── Revenue Case States ───────────────────────────
export const CASE_STATES = {
  NEW: 'new',
  ANALYZING: 'analyzing',
  ANALYZED: 'analyzed',
  SIMULATING: 'simulating',
  DECISION_PENDING: 'decision_pending',
  APPROVED: 'approved',
  EXECUTING: 'executing',
  RECOVERED: 'recovered',
  FAILED: 'failed',
  ESCALATED: 'escalated',
  EXPIRED: 'expired',
  STOPPED: 'stopped',
} as const;

export type CaseState = typeof CASE_STATES[keyof typeof CASE_STATES];

// ─── Valid State Transitions ───────────────────────
export const VALID_TRANSITIONS: Record<CaseState, CaseState[]> = {
  [CASE_STATES.NEW]: [CASE_STATES.ANALYZING],
  [CASE_STATES.ANALYZING]: [CASE_STATES.ANALYZED, CASE_STATES.FAILED, CASE_STATES.ESCALATED],
  [CASE_STATES.ANALYZED]: [CASE_STATES.SIMULATING],
  [CASE_STATES.SIMULATING]: [CASE_STATES.DECISION_PENDING, CASE_STATES.FAILED],
  [CASE_STATES.DECISION_PENDING]: [CASE_STATES.APPROVED, CASE_STATES.ESCALATED, CASE_STATES.STOPPED],
  [CASE_STATES.APPROVED]: [CASE_STATES.EXECUTING],
  [CASE_STATES.EXECUTING]: [CASE_STATES.RECOVERED, CASE_STATES.FAILED, CASE_STATES.ESCALATED, CASE_STATES.EXPIRED],
  [CASE_STATES.RECOVERED]: [],
  [CASE_STATES.FAILED]: [],
  [CASE_STATES.ESCALATED]: [],
  [CASE_STATES.EXPIRED]: [],
  [CASE_STATES.STOPPED]: [],
};

// ─── Recovery Action Types ─────────────────────────
export const ACTION_TYPES = {
  NO_ACTION: 'no_action',
  RETRY_PAYMENT: 'retry_payment',
  SEND_PAYMENT_LINK: 'send_payment_link',
  ALTERNATIVE_PAYMENT_METHOD: 'alternative_payment_method',
  CUSTOMER_NOTIFICATION: 'customer_notification',
  HUMAN_ESCALATION: 'human_escalation',
} as const;

export type ActionType = typeof ACTION_TYPES[keyof typeof ACTION_TYPES];

// ─── Case Types ────────────────────────────────────
export const CASE_TYPES = {
  PAYMENT_FAILURE: 'payment_failure',
  CHECKOUT_ABANDONMENT: 'checkout_abandonment',
  SUBSCRIPTION_FAILURE: 'subscription_failure',
} as const;

export type CaseType = typeof CASE_TYPES[keyof typeof CASE_TYPES];

// ─── Event Types ───────────────────────────────────
export const EVENT_TYPES = {
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_AUTHORIZED: 'payment.authorized',
  PAYMENT_CAPTURED: 'payment.captured',
  PAYMENT_FAILED: 'payment.failed',
  CHECKOUT_STARTED: 'checkout.started',
  CHECKOUT_ABANDONED: 'checkout.abandoned',
  SUBSCRIPTION_PAYMENT_FAILED: 'subscription.payment_failed',
  SUBSCRIPTION_PAYMENT_RECOVERED: 'subscription.payment_recovered',
  REVENUE_CASE_CREATED: 'revenue.case_created',
  REVENUE_CASE_ANALYZED: 'revenue.case_analyzed',
  INTERVENTION_SIMULATED: 'intervention.simulated',
  DECISION_CREATED: 'decision.created',
  DECISION_APPROVED: 'decision.approved',
  DECISION_REJECTED: 'decision.rejected',
  RECOVERY_ACTION_STARTED: 'recovery.action_started',
  RECOVERY_ACTION_SUCCEEDED: 'recovery.action_succeeded',
  RECOVERY_ACTION_FAILED: 'recovery.action_failed',
  RECOVERY_COMPLETED: 'recovery.completed',
  POLICY_VIOLATION: 'policy.violation',
  HUMAN_ESCALATION: 'human.escalation',
} as const;

// ─── Default Policy Limits ─────────────────────────
export const DEFAULT_POLICY = {
  MAX_RETRY_ATTEMPTS: 2,
  MAX_CUSTOMER_CONTACTS: 2,
  MAX_DISCOUNT_PERCENT: 5,
  MAX_AUTOMATED_RECOVERY_MINOR: 10_000_000, // ₹1,00,000
  HIGH_VALUE_THRESHOLD_MINOR: 5_000_000, // ₹50,000
  MIN_RECOVERY_PROBABILITY: 0.10,
  MIN_CONFIDENCE: 0.30,
  CASE_TTL_HOURS: 72,
} as const;

// ─── Event Sources ─────────────────────────────────
export const EVENT_SOURCES = {
  RAZORPAY: 'razorpay',
  SYNTHETIC: 'synthetic',
  INTERNAL: 'internal',
} as const;

// ─── Processing Status ─────────────────────────────
export const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  FAILED: 'failed',
  DUPLICATE: 'duplicate',
} as const;

// ─── Case Priority ─────────────────────────────────
export const CASE_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
