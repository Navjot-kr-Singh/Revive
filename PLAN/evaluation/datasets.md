# REVIVE — Evaluation Datasets

## Synthetic Data Generator

### Requirements
- Deterministic with seed: `SEED=20260826`
- At least 50,000 transactions (target 100,000+)
- Realistic distributions across all dimensions

### Transaction Mix

| Category | Percentage | Count (50k) |
|----------|-----------|-------------|
| Successful payments | 88% | 44,000 |
| Failed payments (recoverable) | 6% | 3,000 |
| Failed payments (non-recoverable) | 3% | 1,500 |
| Checkout abandonment | 2% | 1,000 |
| Subscription failures | 1% | 500 |

### Failure Reason Distribution

| Reason | Percentage of Failures |
|--------|----------------------|
| bank_timeout | 25% |
| insufficient_funds | 20% |
| bank_declined | 15% |
| network_error | 12% |
| authentication_failed | 10% |
| card_expired | 8% |
| upi_timeout | 5% |
| mandate_failure | 3% |
| unknown | 2% |

### Customer Distribution

| Segment | Percentage | Avg Orders | Success Rate |
|---------|-----------|------------|-------------|
| New | 40% | 1 | 85% |
| Repeat (2-10 orders) | 35% | 5 | 93% |
| Loyal (11-50 orders) | 20% | 25 | 97% |
| VIP (50+ orders) | 5% | 80 | 99% |

### Amount Distribution (INR)

| Bucket | Range | Percentage |
|--------|-------|-----------|
| Micro | ₹1 – ₹499 | 15% |
| Small | ₹500 – ₹2,999 | 30% |
| Medium | ₹3,000 – ₹14,999 | 30% |
| Large | ₹15,000 – ₹49,999 | 18% |
| Premium | ₹50,000+ | 7% |

### Payment Method Distribution

| Method | Percentage |
|--------|-----------|
| UPI | 45% |
| Card (Debit) | 25% |
| Card (Credit) | 15% |
| Netbanking | 10% |
| Wallet | 5% |

### Time Patterns
- Peak hours: 10am-2pm, 7pm-11pm (higher volume)
- Off-peak: 2am-7am (lower volume)
- Weekend bump: +10% volume

### Incident Injection
For the hero demo scenario:
- At timestamp T: Bank X UPI success rate drops from 96% → 73%
- Duration: 2 hours
- Affects: ~500 transactions
- Revenue at risk: ~₹12.7L

---

# Ground Truth

## Attached to Every Failed Transaction

| Field | Type | Description |
|-------|------|-------------|
| `recoverable` | boolean | Can this transaction be recovered? |
| `optimal_intervention` | string | Best recovery action |
| `recovery_probability_by_action` | Record<string, number> | Probability per intervention |
| `actual_simulated_outcome` | string | What would actually happen |
| `recovery_delay_minutes` | number | How long recovery takes |

## Ground Truth Rules

1. `bank_timeout` + repeat customer → 75% chance recoverable via retry
2. `bank_timeout` + new customer → 30% chance recoverable via payment link
3. `insufficient_funds` → 10% chance recoverable (customer adds funds)
4. `bank_declined` → 5% chance recoverable
5. `card_expired` → 3% chance recoverable (needs new card)
6. `network_error` → 80% chance recoverable via retry
7. `upi_timeout` → 70% chance recoverable via retry

These probabilities are the "truth" that the model tries to predict.
