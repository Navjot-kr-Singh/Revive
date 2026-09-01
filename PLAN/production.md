# REVIVE — Production Deployment Guide (Vercel + Neon + Clerk)

A beginner-friendly, step-by-step guide to deploying **REVIVE** to **Vercel** with zero downtime and full judge functionality.

---

## 📑 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Step 1: Push Code to GitHub](#2-step-1-push-code-to-github)
3. [Step 2: Set Up Neon Cloud PostgreSQL](#3-step-2-set-up-neon-cloud-postgresql)
4. [Step 3: Run Database Migrations & Seed](#4-step-3-run-database-migrations--seed)
5. [Step 4: Deploy to Vercel](#5-step-4-deploy-to-vercel)
6. [Step 5: Post-Deployment Verification](#6-step-5-post-deployment-verification)
7. [Troubleshooting & FAQs](#7-troubleshooting--faqs)

---

## 1. Prerequisites

Before starting, make sure you have free accounts on:
- [GitHub](https://github.com) (To host your code repository)
- [Vercel](https://vercel.com) (To deploy the Next.js web application)
- [Neon](https://neon.tech) (For your serverless cloud PostgreSQL database)
- [Clerk](https://clerk.com) *(Optional / Pre-configured)*
- [Razorpay](https://razorpay.com) *(Optional / Pre-configured)*

---

## 2. Step 1: Push Code to GitHub

1. Open your terminal in the `Revive` directory.
2. Check that your local git repository is clean:
   ```bash
   git status
   ```
3. If you haven't connected your GitHub remote yet:
   - Create a new **Private** or **Public** repository on [GitHub](https://github.com/new) named `Revive`.
   - Run these commands to push your code:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/Revive.git
   git branch -M master
   git push -u origin master
   ```

---

## 3. Step 2: Set Up Neon Cloud PostgreSQL

1. Go to [Neon Console](https://console.neon.tech).
2. Create a new Project named `revive-production`.
3. In the Neon Dashboard, locate your **Connection Details**.
4. Select **Node.js** / **PostgreSQL connection string** with **Connection Pooling (Recommended)**.
5. Your connection string looks like this:
   ```text
   postgresql://neondb_owner:npg_cp5SWq3GrXMV@ep-mute-glitter-ayy95qtj-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

---

## 4. Step 3: Run Database Migrations & Seed

Before deploying to Vercel, push all database tables and seed initial demo data to your Neon database from your local terminal:

```bash
# 1. Push all 12 Drizzle database schema tables to Neon
DATABASE_URL="your-neon-database-url-here" npm run db:push

# 2. Seed demo merchants (Acme Electronics), default policies, and active cases
DATABASE_URL="your-neon-database-url-here" npm run db:seed
```

> **Expected Output:**
> ```text
> [✓] Changes applied
> ✅ Seed complete! Seeded 3 cases for Acme and 1 case for Globex.
> ✨ Database successfully seeded.
> ```

---

## 5. Step 4: Deploy to Vercel

### A. Import Project into Vercel
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** $\to$ **"Project"**.
3. Under *Import Git Repository*, find your **Revive** repository and click **Import**.

### B. Configure Project Settings
- **Framework Preset**: `Next.js`
- **Root Directory**: `./` (Default)
- **Build Command**: `npm run build` (Default)
- **Output Directory**: `.next` (Default)
- **Install Command**: `npm install` (Default)

### C. Add Environment Variables in Vercel
Scroll down to the **Environment Variables** section in Vercel. Copy and paste the following key-value pairs:

| Variable Key | Value / Instructions |
|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_cp5SWq3GrXMV@ep-mute-glitter-ayy95qtj-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `DIRECT_URL` | `postgresql://neondb_owner:npg_cp5SWq3GrXMV@ep-mute-glitter-ayy95qtj-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `DEMO_MODE` | `true` |
| `NODE_ENV` | `production` |
| `AI_PROVIDER` | `deterministic` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_bHVja3ktZm94aG91bmQtMTUuY2xlcmsuYWNjb3VudHMuZGV2JA` |
| `CLERK_SECRET_KEY` | `sk_test_Qld0iYCvF9xa826onADcxZIJUfb748cAG1ym6JPjlK` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` |
| `RAZORPAY_KEY_ID` | `rzp_test_RtQW1Rmgl5jqFr` |
| `RAZORPAY_KEY_SECRET` | `Gkw3sUr6LwnOgBUpNSV1k5an` |
| `NEXT_PUBLIC_APP_URL` | `https://your-project-name.vercel.app` *(Update after Vercel assigns your URL)* |

### D. Click Deploy
Click the **"Deploy"** button. Vercel will build the Next.js project using Turbopack in ~60 seconds.

---

## 6. Step 5: Post-Deployment Verification

Once Vercel finishes deploying, test your live deployment with these URLs:

1. **System Readiness Check**:
   - URL: `https://your-project.vercel.app/api/ready`
   - Expected Output:
     ```json
     {
       "status": "READY",
       "subsystems": {
         "database": "CONNECTED",
         "eventPipeline": "HEALTHY",
         "aiInvestigator": "HEALTHY",
         "policyEngine": "HEALTHY",
         "recoveryExecutor": "HEALTHY",
         "reconciliationEngine": "HEALTHY"
       }
     }
     ```

2. **Revenue Control Room**:
   - URL: `https://your-project.vercel.app/dashboard`
   - Check that revenue cards (₹12.5L Revenue at Risk, Verified Recovered) and the active pipeline load cleanly.

3. **Case Detail & Simulation**:
   - URL: `https://your-project.vercel.app/dashboard/cases`
   - Open any case to verify that the **Counterfactual Simulation Matrix** shows Candidate 1 (`DENIED`) and Candidate 2 (`SELECTED`).

4. **Interactive Simulator**:
   - URL: `https://your-project.vercel.app/dashboard/simulator`
   - Click preset buttons to verify real-time Net EV ranking.

5. **Experiments & Benchmarks**:
   - URL: `https://your-project.vercel.app/dashboard/experiments`
   - Verify that 100k Benchmark and 5-Tier Ablation tabs display accurately.

6. **Human Review Queue**:
   - URL: `https://your-project.vercel.app/dashboard/review`
   - Check that operator actions (`APPROVE` / `REJECT`) are responsive.

7. **Cryptographic Audit Ledger**:
   - URL: `https://your-project.vercel.app/dashboard/audit`
   - Verify that audit timeline events and payloads load from your database.

---

## 7. Troubleshooting & FAQs

### Q: The dashboard shows "No merchant context found"
**Fix**: Run the database seed script against your production database:
```bash
DATABASE_URL="your-neon-database-url" npm run db:seed
```

### Q: Why is `DEMO_MODE=true` recommended for hackathon judges?
**Answer**: With `DEMO_MODE=true`, hackathon judges can immediately open your deployment URL, view the live control room, run simulations, and review cases without getting blocked by a mandatory signup/login wall.

### Q: How do I update `NEXT_PUBLIC_APP_URL` after deployment?
**Fix**:
1. In the Vercel project dashboard, go to **Settings** $\to$ **Environment Variables**.
2. Edit `NEXT_PUBLIC_APP_URL` and set it to your actual Vercel domain (e.g. `https://revive-control.vercel.app`).
3. Go to **Deployments**, click the three dots (`...`) on your latest deployment, and click **Redeploy**.

---

**🎉 Congratulations! Your REVIVE Autonomous Control Plane is now live in production!**
