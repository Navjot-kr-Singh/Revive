# REVIVE — UI/UX Specification

## 1. Design Principles

- **Professional fintech operations interface** — NOT a generic AI chatbot
- **Dark mode** — High-contrast, information-dense
- **Typography-driven** — Strong hierarchy, monospace for numbers
- **Data-forward** — Money, risk, action, evidence, outcome
- **Accessible** — shadcn/ui components, ARIA labels
- **Responsive** — Desktop-first, tablet-friendly

### Do NOT create:
- Generic AI chatbot UI
- Excessive gradients/animations
- Fake futuristic visuals
- Giant AI brain graphics
- Low-density marketing pages

### Do create:
- Dark professional operations interface
- Strong monetary hierarchy (₹ values prominent)
- Status indicators with semantic colors
- Timeline views for case progression
- Evidence panels for AI analysis
- Decision cards for intervention comparison
- Charts for revenue metrics
- Searchable audit trails

---

## 2. Color System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `hsl(222, 47%, 8%)` | Main background |
| `--bg-secondary` | `hsl(222, 35%, 12%)` | Card backgrounds |
| `--bg-tertiary` | `hsl(222, 30%, 16%)` | Elevated surfaces |
| `--text-primary` | `hsl(0, 0%, 95%)` | Primary text |
| `--text-secondary` | `hsl(220, 15%, 65%)` | Secondary text |
| `--accent-green` | `hsl(142, 71%, 45%)` | Recovery, success |
| `--accent-red` | `hsl(0, 72%, 51%)` | Risk, failure, at-risk |
| `--accent-amber` | `hsl(38, 92%, 50%)` | Warning, pending |
| `--accent-blue` | `hsl(217, 91%, 60%)` | Info, active |
| `--accent-purple` | `hsl(262, 83%, 58%)` | AI, intelligence |

---

## 3. Page Specifications

### 3.1 Landing / Demo Page
- Product name and tagline
- Concise product explanation
- "Enter Control Room" CTA
- Key metrics preview
- Tech stack badges

### 3.2 Revenue Control Room (Dashboard)
**Layout**: Grid with metric cards + charts

| Widget | Content |
|--------|---------|
| Revenue at Risk | ₹ amount, trend arrow |
| Revenue Recovered | ₹ amount, trend arrow |
| Recovery Rate | %, bar indicator |
| Net Recovery | ₹ amount |
| Active Cases | Count by status |
| Active Incidents | Count with severity |
| Avg Recovery Time | Duration |
| Baseline vs REVIVE | Comparison chart |
| Revenue Timeline | Area chart, 24h/7d/30d |
| Case Status Distribution | Donut chart |
| Recovery by Action Type | Bar chart |

### 3.3 Revenue Cases
**Layout**: Filterable/sortable data table

| Column | Content |
|--------|---------|
| Case ID | Linked identifier |
| Customer | Masked ID |
| Order | Order reference |
| Amount | ₹ formatted |
| Failure | Reason badge |
| Risk | Priority indicator |
| Expected Recovery | ₹ amount |
| Action | Selected intervention |
| Status | State badge |
| Created | Relative time |

Filters: Status, Case Type, Priority, Date Range
Sort: Amount, Created, Status

### 3.4 Case Detail
**Layout**: Multi-panel detail view

| Panel | Content |
|-------|---------|
| Summary | Case ID, amount, status, timeline |
| Revenue at Risk | Amount, calculation basis |
| Timeline | Chronological event list |
| Evidence | Signals collected by agent |
| Root Cause | AI-determined cause + confidence |
| Interventions | All simulated options with comparison |
| Selected Action | Chosen intervention with reasoning |
| Policy Evaluation | Rules checked, outcome |
| AI Explanation | Natural language explanation |
| Execution | Action status, external references |
| Actual Outcome | Recovery result, amount |
| Audit Trail | All events for this case |

### 3.5 Intervention Simulator
**Layout**: Side-by-side comparison cards

For each intervention:
- Action type
- Recovery probability (progress bar)
- Expected recovery (₹)
- Intervention cost (₹)
- Expected net value (₹)
- Customer friction (gauge)
- Risk score (gauge)
- Selected indicator

### 3.6 Live Incident Center
**Layout**: Alert panel + metrics + investigation

| Widget | Content |
|--------|---------|
| Active Incidents | List with severity badges |
| Payment Success Rate | Real-time gauge |
| Revenue at Risk/Hour | ₹ amount |
| Affected Segment | Bank, method, region |
| Root Cause | AI investigation result |
| Agent Investigation | Tool calls + findings |
| Recommended Action | With policy status |
| Execution Status | Progress |
| Recovery Impact | Before/after metrics |

### 3.7 Experiment / Evaluation Dashboard
**Layout**: Two-column comparison

| Metric | Baseline | REVIVE | Δ |
|--------|----------|--------|---|
| Recovery Rate | % | % | ×improvement |
| Recovered GMV | ₹ | ₹ | ₹ delta |
| Net Recovered | ₹ | ₹ | ₹ delta |
| Sample Size | n | n | |
| Intervention Rate | — | % | |
| False Intervention | — | % | |
| Avg Recovery Time | — | duration | |

### 3.8 Audit Center
**Layout**: Searchable timeline

- Search by entity type, entity ID, event type, date range
- Filterable by actor (system, agent, human)
- Each entry shows: timestamp, event type, actor, details
- Expandable detail view

---

## 4. Navigation

```
Sidebar:
├── Control Room        (dashboard)
├── Cases               (case list)
├── Incidents           (incident center)
├── Simulator           (intervention simulator)
├── Experiments         (evaluation dashboard)
├── Audit               (audit center)
└── Settings            (merchant config)
```

---

## 5. Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| ≥1280px | Full sidebar + content |
| ≥768px | Collapsed sidebar + content |
| <768px | Bottom nav + stacked content |
