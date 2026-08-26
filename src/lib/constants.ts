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

// ─── Incident States & Transitions ─────────────────
export const INCIDENT_STATES = {
  DETECTED: 'detected',
  INVESTIGATING: 'investigating',
  CONFIRMED: 'confirmed',
  MITIGATING: 'mitigating',
  MONITORING: 'monitoring',
  RESOLVED: 'resolved',
  FALSE_POSITIVE: 'false_positive',
  DISMISSED: 'dismissed',
} as const;

export type IncidentState = typeof INCIDENT_STATES[keyof typeof INCIDENT_STATES];

export const VALID_INCIDENT_TRANSITIONS: Record<IncidentState, IncidentState[]> = {
  [INCIDENT_STATES.DETECTED]: [INCIDENT_STATES.INVESTIGATING, INCIDENT_STATES.CONFIRMED, INCIDENT_STATES.FALSE_POSITIVE, INCIDENT_STATES.DISMISSED],
  [INCIDENT_STATES.INVESTIGATING]: [INCIDENT_STATES.CONFIRMED, INCIDENT_STATES.FALSE_POSITIVE, INCIDENT_STATES.DISMISSED],
  [INCIDENT_STATES.CONFIRMED]: [INCIDENT_STATES.MITIGATING, INCIDENT_STATES.MONITORING, INCIDENT_STATES.RESOLVED],
  [INCIDENT_STATES.MITIGATING]: [INCIDENT_STATES.MONITORING, INCIDENT_STATES.RESOLVED],
  [INCIDENT_STATES.MONITORING]: [INCIDENT_STATES.RESOLVED, INCIDENT_STATES.MITIGATING],
  [INCIDENT_STATES.RESOLVED]: [],
  [INCIDENT_STATES.FALSE_POSITIVE]: [],
  [INCIDENT_STATES.DISMISSED]: [],
};

// ─── Incident Severity ─────────────────────────────
export const INCIDENT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type IncidentSeverity = typeof INCIDENT_SEVERITY[keyof typeof INCIDENT_SEVERITY];

// ─── Extended Event Taxonomy ───────────────────────
export const EVENT_TYPES = {
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_AUTHORIZED: 'payment.authorized',
  PAYMENT_CAPTURED: 'payment.captured',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYMENT_PARTIALLY_REFUNDED: 'payment.partially_refunded',

  CHECKOUT_STARTED: 'checkout.started',
  CHECKOUT_COMPLETED: 'checkout.completed',
  CHECKOUT_ABANDONED: 'checkout.abandoned',

  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_PAYMENT_FAILED: 'subscription.payment_failed',
  SUBSCRIPTION_PAYMENT_SUCCEEDED: 'subscription.payment_succeeded',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',

  INVOICE_CREATED: 'invoice.created',
  INVOICE_OVERDUE: 'invoice.overdue',
  INVOICE_PAID: 'invoice.paid',

  MANDATE_CREATED: 'mandate.created',
  MANDATE_FAILED: 'mandate.failed',
  MANDATE_SUCCEEDED: 'mandate.succeeded',

  REVENUE_CASE_CREATED: 'revenue.case_created',
  REVENUE_CASE_UPDATED: 'revenue.case_updated',
  REVENUE_CASE_ANALYZED: 'revenue.case_analyzed',

  INTERVENTION_SIMULATED: 'intervention.simulated',
  DECISION_CREATED: 'decision.created',
  DECISION_APPROVED: 'decision.approved',
  DECISION_REJECTED: 'decision.rejected',

  RECOVERY_ACTION_STARTED: 'recovery.action_started',
  RECOVERY_ACTION_SUCCEEDED: 'recovery.action_succeeded',
  RECOVERY_ACTION_FAILED: 'recovery.action_failed',
  RECOVERY_COMPLETED: 'recovery.completed',

  INCIDENT_DETECTED: 'incident.detected',
  INCIDENT_CONFIRMED: 'incident.confirmed',
  INCIDENT_UPDATED: 'incident.updated',
  INCIDENT_ESCALATED: 'incident.escalated',
  INCIDENT_RESOLVED: 'incident.resolved',

  POLICY_VIOLATION: 'policy.violation',
  HUMAN_ESCALATION: 'human.escalation',
} as const;

// ─── Failure Taxonomy ──────────────────────────────
export interface FailureDefinition {
  code: string;
  category: 'bank_issue' | 'customer_error' | 'network_error' | 'risk_auth' | 'system_unknown';
  recoverability: 'high' | 'medium' | 'low' | 'none';
  severity: 'low' | 'medium' | 'high';
  historicalProbability: number;
  description: string;
}

export const FAILURE_TAXONOMY: Record<string, FailureDefinition> = {
  BANK_TIMEOUT: {
    code: 'BANK_TIMEOUT',
    category: 'bank_issue',
    recoverability: 'high',
    severity: 'medium',
    historicalProbability: 0.25,
    description: 'Bank processing timed out during transaction',
  },
  INSUFFICIENT_FUNDS: {
    code: 'INSUFFICIENT_FUNDS',
    category: 'customer_error',
    recoverability: 'medium',
    severity: 'low',
    historicalProbability: 0.20,
    description: 'Customer account had insufficient balance',
  },
  BANK_DECLINED: {
    code: 'BANK_DECLINED',
    category: 'bank_issue',
    recoverability: 'low',
    severity: 'medium',
    historicalProbability: 0.15,
    description: 'Issuing bank explicitly declined authorization',
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    category: 'network_error',
    recoverability: 'high',
    severity: 'low',
    historicalProbability: 0.12,
    description: 'Network communication failure during gateway handshake',
  },
  AUTHENTICATION_FAILURE: {
    code: 'AUTHENTICATION_FAILURE',
    category: 'risk_auth',
    recoverability: 'medium',
    severity: 'low',
    historicalProbability: 0.10,
    description: '3D Secure or OTP verification failed',
  },
  CARD_EXPIRED: {
    code: 'CARD_EXPIRED',
    category: 'customer_error',
    recoverability: 'low',
    severity: 'low',
    historicalProbability: 0.08,
    description: 'Card validity expired',
  },
  UPI_TIMEOUT: {
    code: 'UPI_TIMEOUT',
    category: 'bank_issue',
    recoverability: 'high',
    severity: 'medium',
    historicalProbability: 0.05,
    description: 'NPCI / UPI PSP server timeout during debit verification',
  },
  UPI_DECLINED: {
    code: 'UPI_DECLINED',
    category: 'customer_error',
    recoverability: 'medium',
    severity: 'low',
    historicalProbability: 0.03,
    description: 'Customer declined UPI collect request or entered incorrect MPIN',
  },
  LIMIT_EXCEEDED: {
    code: 'LIMIT_EXCEEDED',
    category: 'customer_error',
    recoverability: 'low',
    severity: 'low',
    historicalProbability: 0.02,
    description: 'Daily transaction count or amount limit exceeded',
  },
  GATEWAY_TIMEOUT: {
    code: 'GATEWAY_TIMEOUT',
    category: 'network_error',
    recoverability: 'high',
    severity: 'high',
    historicalProbability: 0.03,
    description: 'Acquiring gateway latency exceeded cutoff threshold',
  },
  CARD_DECLINED: {
    code: 'CARD_DECLINED',
    category: 'bank_issue',
    recoverability: 'low',
    severity: 'medium',
    historicalProbability: 0.05,
    description: 'Card network rejected charge',
  },
  UNKNOWN_FAILURE: {
    code: 'UNKNOWN_FAILURE',
    category: 'system_unknown',
    recoverability: 'low',
    severity: 'medium',
    historicalProbability: 0.02,
    description: 'Unclassified upstream failure response',
  },
};

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
