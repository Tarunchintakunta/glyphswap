ALTER TABLE "job" DROP CONSTRAINT "job_image_id_image_id_fk";--> statement-breakpoint
ALTER TABLE "job" ALTER COLUMN "image_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_image_id_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."image"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "inference_id" text;--> statement-breakpoint
ALTER TABLE "result" ALTER COLUMN "storage_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "result" ADD COLUMN "status" text DEFAULT 'succeeded' NOT NULL;--> statement-breakpoint
ALTER TABLE "result" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "result" ALTER COLUMN "width" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "result" ALTER COLUMN "height" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "rate_event" DROP CONSTRAINT "rate_event_api_key_id_api_key_id_fk";--> statement-breakpoint
ALTER TABLE "rate_event" ALTER COLUMN "api_key_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rate_event" ADD CONSTRAINT "rate_event_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_event" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "rate_event" ADD CONSTRAINT "rate_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_event" ADD COLUMN "kind" text DEFAULT 'read' NOT NULL;--> statement-breakpoint
CREATE INDEX "rate_event_user_at_idx" ON "rate_event" USING btree ("user_id","at");--> statement-breakpoint
CREATE TABLE "idempotency" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"job_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_user_key_unique" UNIQUE("user_id","key")
);--> statement-breakpoint
ALTER TABLE "idempotency" ADD CONSTRAINT "idempotency_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency" ADD CONSTRAINT "idempotency_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idempotency_user_idx" ON "idempotency" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idempotency_job_idx" ON "idempotency" USING btree ("job_id");--> statement-breakpoint
CREATE TABLE "webhook_outbox" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"job_id" text NOT NULL,
	"url" text NOT NULL,
	"body" text NOT NULL,
	"signature" text NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"next_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"last_status" integer,
	CONSTRAINT "webhook_outbox_job_unique" UNIQUE("job_id")
);--> statement-breakpoint
ALTER TABLE "webhook_outbox" ADD CONSTRAINT "webhook_outbox_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webhook_outbox_job_idx" ON "webhook_outbox" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "webhook_outbox_next_idx" ON "webhook_outbox" USING btree ("next_at");--> statement-breakpoint
CREATE UNIQUE INDEX "result_job_kind_unique" ON "result" ("job_id","kind");
