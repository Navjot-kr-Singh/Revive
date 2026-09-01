# REVIVE — Financial Correctness & Arithmetic Precision Audit

## 1. Executive Summary & Monetary Invariant
In fintech software, floating-point arithmetic introduces rounding drift (e.g. `0.1 + 0.2 = 0.30000000000000004`), which can cause reconciliation mismatches and regulatory non-compliance.

REVIVE enforces an architectural rule across all services:
> **All monetary values are stored and calculated in integer minor currency units (paise for INR) using `Decimal.js` (20-digit precision, `ROUND_HALF_EVEN` banker's rounding). Floating-point arithmetic is strictly prohibited in financial decision and execution pipelines.**

---

## 2. Core Monetary Functions & Verification

| Function | Implementation Method | Precision Guarantee |
|---|---|---|
| `toMinorUnits` | `new Decimal(major).times(multiplier)` | Exact integer paise; throws on fractional paise |
| `toMajorUnits` | `new Decimal(minor).dividedBy(multiplier)` | Returns Decimal object for safe downstream arithmetic |
| `formatMoney` | `formatIndianNumber(major)` | Exact Indian numbering format (`₹24,999.00`, `₹12,34,567.89`) |
| `addMoney` / `subtractMoney` | `Decimal.plus()` / `Decimal.minus()` | Exact integer addition and subtraction |
| `probabilityToBps` | `new Decimal(p).times(10000).round()` | Integer basis points ($0 \dots 10,000\text{ bps}$) |
| `calculateExpectedRecoveryMinor`| `floor(amountMinor * bps / 10000)` | Integer minor unit floor |
| `calculateExpectedNetValueMinor`| `Decimal(exp).minus(cost).minus(friction)`| Exact minor unit integer EV |

---

## 3. Unit Test Verification
Tested in [`tests/unit/money.test.ts`](file:///Users/navjotkumarsingh/Desktop/Revive/tests/unit/money.test.ts) across 30 dedicated financial unit tests:
- Zero amount handling (₹0.00 $\implies$ 0 paise)
- High-value ticket bounds (₹10 Crores $\implies$ 1,000,000,000 paise)
- Negative EV rejection ($EV \le 0 \implies \text{DENY}$)
- Basis-point conversion roundtrips (3800 bps $\iff 0.38$)
- Indian numbering format validation across Thousands, Lakhs, and Crores.
