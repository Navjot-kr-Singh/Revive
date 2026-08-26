CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"actor" varchar(255),
	"data" jsonb,
	"correlation_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"external_id" varchar(255),
	"email_hash" varchar(255),
	"display_id" varchar(50) NOT NULL,
	"segment" varchar(100),
	"total_orders" integer DEFAULT 0,
	"total_success_payments" integer DEFAULT 0,
	"total_failed_payments" integer DEFAULT 0,
	"lifetime_value_minor" bigint DEFAULT 0,
	"currency" varchar(3) DEFAULT 'INR',
	"first_seen_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intervention_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"action_type" varchar(100) NOT NULL,
	"recovery_probability" real NOT NULL,
	"expected_recovery_minor" bigint NOT NULL,
	"intervention_cost_minor" bigint DEFAULT 0 NOT NULL,
	"expected_net_value_minor" bigint NOT NULL,
	"customer_friction" real DEFAULT 0 NOT NULL,
	"risk_score" real DEFAULT 0 NOT NULL,
	"confidence" real NOT NULL,
	"is_selected" boolean DEFAULT false,
	"is_policy_approved" boolean,
	"policy_rejection_reason" varchar(255),
	"reasoning" text,
	"model_version" varchar(50),
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_merchant_members_merchant_user" UNIQUE("merchant_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"category" varchar(100),
	"razorpay_account_id" varchar(255),
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"external_order_id" varchar(255),
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" varchar(50) DEFAULT 'created' NOT NULL,
	"payment_method" varchar(50),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"payment_id" uuid,
	"event_type" varchar(100) NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"source" varchar(100) NOT NULL,
	"source_event_id" varchar(255),
	"payload" jsonb NOT NULL,
	"payload_hash" varchar(64),
	"processing_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_payment_events_source_event" UNIQUE("source","source_event_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"external_payment_id" varchar(255),
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" varchar(50) DEFAULT 'created' NOT NULL,
	"payment_method" varchar(50),
	"bank" varchar(100),
	"failure_reason" varchar(255),
	"failure_code" varchar(100),
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"is_recurring" boolean DEFAULT false,
	"authorized_at" timestamp with time zone,
	"captured_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"policy_version" varchar(50) NOT NULL,
	"rules" jsonb NOT NULL,
	"max_retry_attempts" integer DEFAULT 2 NOT NULL,
	"max_customer_contacts" integer DEFAULT 2 NOT NULL,
	"max_discount_percent" integer DEFAULT 5 NOT NULL,
	"max_automated_recovery_minor" bigint DEFAULT 10000000 NOT NULL,
	"high_value_threshold_minor" bigint DEFAULT 5000000 NOT NULL,
	"min_recovery_probability" real DEFAULT 0.1 NOT NULL,
	"min_confidence" real DEFAULT 0.3 NOT NULL,
	"allowed_actions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recovery_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"action_type" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"max_attempts" integer DEFAULT 2 NOT NULL,
	"external_reference_id" varchar(255),
	"request_payload" jsonb,
	"response_payload" jsonb,
	"error_message" text,
	"timeout_seconds" integer DEFAULT 300,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recovery_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"intervention_option_id" uuid,
	"action_type" varchar(100) NOT NULL,
	"reason" text NOT NULL,
	"input_signals" jsonb,
	"model_version" varchar(50),
	"policy_version" varchar(50),
	"confidence" real,
	"expected_recovery_minor" bigint,
	"expected_cost_minor" bigint,
	"expected_customer_friction" real,
	"decision_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"decided_by" varchar(100),
	"decided_at" timestamp with time zone,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recovery_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"outcome_type" varchar(50) NOT NULL,
	"recovered_amount_minor" bigint DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"verification_method" varchar(100),
	"verification_data" jsonb,
	"time_to_recovery_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_case_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"signal_type" varchar(100) NOT NULL,
	"signal_data" jsonb NOT NULL,
	"source" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"payment_id" uuid,
	"customer_id" uuid,
	"order_id" uuid,
	"case_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium',
	"amount_at_risk_minor" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"failure_reason" varchar(255),
	"failure_code" varchar(100),
	"root_cause" varchar(255),
	"root_cause_confidence" real,
	"recovery_probability" real,
	"model_version" varchar(50),
	"selected_intervention" varchar(100),
	"expected_recovery_minor" bigint,
	"actual_recovery_minor" bigint DEFAULT 0,
	"intervention_cost_minor" bigint DEFAULT 0,
	"net_recovery_minor" bigint DEFAULT 0,
	"retry_count" integer DEFAULT 0,
	"customer_contacts" integer DEFAULT 0,
	"escalated" boolean DEFAULT false,
	"escalation_reason" varchar(255),
	"experiment_id" uuid,
	"experiment_group" varchar(20),
	"resolved_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_options" ADD CONSTRAINT "intervention_options_case_id_revenue_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."revenue_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_members" ADD CONSTRAINT "merchant_members_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_members" ADD CONSTRAINT "merchant_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_actions" ADD CONSTRAINT "recovery_actions_case_id_revenue_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."revenue_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_actions" ADD CONSTRAINT "recovery_actions_decision_id_recovery_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."recovery_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_actions" ADD CONSTRAINT "recovery_actions_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_decisions" ADD CONSTRAINT "recovery_decisions_case_id_revenue_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."revenue_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_decisions" ADD CONSTRAINT "recovery_decisions_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_decisions" ADD CONSTRAINT "recovery_decisions_intervention_option_id_intervention_options_id_fk" FOREIGN KEY ("intervention_option_id") REFERENCES "public"."intervention_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_outcomes" ADD CONSTRAINT "recovery_outcomes_case_id_revenue_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."revenue_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_outcomes" ADD CONSTRAINT "recovery_outcomes_action_id_recovery_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."recovery_actions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_outcomes" ADD CONSTRAINT "recovery_outcomes_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_case_signals" ADD CONSTRAINT "revenue_case_signals_case_id_revenue_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."revenue_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_cases" ADD CONSTRAINT "revenue_cases_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_cases" ADD CONSTRAINT "revenue_cases_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_cases" ADD CONSTRAINT "revenue_cases_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_cases" ADD CONSTRAINT "revenue_cases_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_revenue_cases_merchant_status" ON "revenue_cases" USING btree ("merchant_id","status");--> statement-breakpoint
CREATE INDEX "idx_revenue_cases_payment" ON "revenue_cases" USING btree ("payment_id");