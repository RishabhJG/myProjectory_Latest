CREATE TABLE "portfolio_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"share_id" text NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio_shares" ADD CONSTRAINT "portfolio_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "portfolio_shares" ADD CONSTRAINT "portfolio_shares_share_id_unique" UNIQUE("share_id");
--> statement-breakpoint
ALTER TABLE "portfolio_shares" ADD CONSTRAINT "portfolio_shares_user_id_unique" UNIQUE("user_id");
