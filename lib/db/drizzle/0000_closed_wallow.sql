CREATE TABLE "activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "colleges" (
	"college_id" serial PRIMARY KEY NOT NULL,
	"college_name" text NOT NULL,
	"university_name" text,
	"city" text,
	"state" text,
	"country" text DEFAULT 'India',
	"website_url" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_roles" (
	"domain_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	CONSTRAINT "domain_roles_domain_id_role_id_pk" PRIMARY KEY("domain_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "domain_skills" (
	"domain_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	"skill_type" text DEFAULT 'Core',
	"weightage" real DEFAULT 1,
	CONSTRAINT "domain_skills_domain_id_skill_id_pk" PRIMARY KEY("domain_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"domain_id" serial PRIMARY KEY NOT NULL,
	"domain_name" text NOT NULL,
	"category" text DEFAULT 'Tech',
	"description" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "domains_domain_name_unique" UNIQUE("domain_name")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"role_id" serial PRIMARY KEY NOT NULL,
	"domain_id" integer NOT NULL,
	"role_name" text NOT NULL,
	"role_description" text,
	CONSTRAINT "roles_domain_id_role_name_unique" UNIQUE("domain_id","role_name")
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"skill_id" serial PRIMARY KEY NOT NULL,
	"skill_name" text NOT NULL,
	"skill_description" text,
	CONSTRAINT "skills_skill_name_unique" UNIQUE("skill_name")
);
--> statement-breakpoint
CREATE TABLE "stack_skills" (
	"stack_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	"sequence_no" integer,
	"is_required" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "stack_skills_stack_id_skill_id_pk" PRIMARY KEY("stack_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "tech_stacks" (
	"stack_id" serial PRIMARY KEY NOT NULL,
	"domain_id" integer NOT NULL,
	"stack_name" text NOT NULL,
	"stack_description" text,
	"difficulty_level" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "tech_stacks_domain_id_stack_name_unique" UNIQUE("domain_id","stack_name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"first_name" text NOT NULL,
	"last_name" text,
	"mobile" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "career_goals" (
	"career_goal_id" serial PRIMARY KEY NOT NULL,
	"career_goal_name" text NOT NULL,
	"description" text,
	CONSTRAINT "career_goals_career_goal_name_unique" UNIQUE("career_goal_name")
);
--> statement-breakpoint
CREATE TABLE "interests" (
	"interest_id" serial PRIMARY KEY NOT NULL,
	"interest_name" text NOT NULL,
	CONSTRAINT "interests_interest_name_unique" UNIQUE("interest_name")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"notification_id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"notification_type" text,
	"title" text NOT NULL,
	"body" text,
	"is_read" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_career_goals" (
	"student_id" integer NOT NULL,
	"career_goal_id" integer NOT NULL,
	"priority_no" integer DEFAULT 1,
	CONSTRAINT "student_career_goals_student_id_career_goal_id_pk" PRIMARY KEY("student_id","career_goal_id")
);
--> statement-breakpoint
CREATE TABLE "student_domain_preferences" (
	"student_id" integer NOT NULL,
	"domain_id" integer NOT NULL,
	"priority_type" text DEFAULT 'Primary',
	"selected_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_domain_preferences_student_id_domain_id_pk" PRIMARY KEY("student_id","domain_id")
);
--> statement-breakpoint
CREATE TABLE "student_interests" (
	"student_id" integer NOT NULL,
	"interest_id" integer NOT NULL,
	CONSTRAINT "student_interests_student_id_interest_id_pk" PRIMARY KEY("student_id","interest_id")
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"student_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"college_id" integer,
	"student_code" text,
	"degree_name" text,
	"specialization" text,
	"graduation_year" integer,
	"current_semester" text,
	"bio" text,
	"linkedin_url" text,
	"github_url" text,
	"resume_file_url" text,
	"primary_domain_id" integer,
	"profile_completeness_pct" real DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "student_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "student_stack_selections" (
	"selection_id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"stack_id" integer NOT NULL,
	"selection_type" text DEFAULT 'Primary',
	"status" text DEFAULT 'Selected',
	"selected_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "student_stack_selections_student_id_stack_id_unique" UNIQUE("student_id","stack_id")
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"certification_id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"certification_name" text NOT NULL,
	"issuing_organization" text,
	"issue_date" text,
	"expiry_date" text,
	"credential_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_media" (
	"media_id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"media_type" text DEFAULT 'Image',
	"file_url" text NOT NULL,
	"caption" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_skills" (
	"project_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	"coverage_level" text DEFAULT 'Basic',
	CONSTRAINT "project_skills_project_id_skill_id_pk" PRIMARY KEY("project_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "project_stack_mapping" (
	"project_id" integer NOT NULL,
	"stack_id" integer NOT NULL,
	"roadmap_item_id" integer,
	CONSTRAINT "project_stack_mapping_project_id_stack_id_pk" PRIMARY KEY("project_id","stack_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"project_id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"project_title" text NOT NULL,
	"project_description" text,
	"source_type" text DEFAULT 'External',
	"github_url" text,
	"live_url" text,
	"docs_url" text,
	"start_date" text,
	"end_date" text,
	"project_status" text DEFAULT 'Completed',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "student_skills" (
	"student_skill_id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	"proficiency_level" text,
	"source_type" text DEFAULT 'Self Declared',
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_skills_student_id_skill_id_source_type_unique" UNIQUE("student_id","skill_id","source_type")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"company_id" serial PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"website_url" text,
	"city" text,
	"state" text,
	"country" text DEFAULT 'India',
	"is_claimed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_company_name_unique" UNIQUE("company_name")
);
--> statement-breakpoint
CREATE TABLE "job_domains" (
	"job_id" integer NOT NULL,
	"domain_id" integer NOT NULL,
	CONSTRAINT "job_domains_job_id_domain_id_pk" PRIMARY KEY("job_id","domain_id")
);
--> statement-breakpoint
CREATE TABLE "job_roles" (
	"job_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	CONSTRAINT "job_roles_job_id_role_id_pk" PRIMARY KEY("job_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "job_skills" (
	"job_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	"demand_weight" real DEFAULT 1,
	CONSTRAINT "job_skills_job_id_skill_id_pk" PRIMARY KEY("job_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"job_id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"external_job_ref" text,
	"source_channel" text DEFAULT 'Manual',
	"job_title" text NOT NULL,
	"job_description" text,
	"location_text" text,
	"work_mode" text,
	"min_experience_years" real DEFAULT 0,
	"max_experience_years" real DEFAULT 3,
	"application_url" text,
	"posted_date" timestamp,
	"expiry_date" timestamp,
	"status" text DEFAULT 'Published',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"normalized_hash" text
);
--> statement-breakpoint
CREATE TABLE "trend_domain_metrics" (
	"trend_snapshot_id" integer NOT NULL,
	"domain_id" integer NOT NULL,
	"popularity_index" real,
	CONSTRAINT "trend_domain_metrics_trend_snapshot_id_domain_id_pk" PRIMARY KEY("trend_snapshot_id","domain_id")
);
--> statement-breakpoint
CREATE TABLE "trend_skill_metrics" (
	"trend_snapshot_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	"frequency_count" integer DEFAULT 0 NOT NULL,
	"demand_rank" integer,
	"weightage_score" real,
	"is_emerging" integer DEFAULT 0 NOT NULL,
	"is_declining" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "trend_skill_metrics_trend_snapshot_id_skill_id_pk" PRIMARY KEY("trend_snapshot_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "trend_snapshots" (
	"trend_snapshot_id" serial PRIMARY KEY NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"confidence_score" real
);
--> statement-breakpoint
CREATE TABLE "readiness_gap_items" (
	"gap_item_id" serial PRIMARY KEY NOT NULL,
	"readiness_score_id" integer NOT NULL,
	"gap_type" text NOT NULL,
	"reference_id" integer,
	"gap_description" text NOT NULL,
	"severity" text DEFAULT 'Medium'
);
--> statement-breakpoint
CREATE TABLE "readiness_scores" (
	"readiness_score_id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"domain_id" integer NOT NULL,
	"stack_id" integer,
	"trend_snapshot_id" integer,
	"total_score" real NOT NULL,
	"level_classification" text,
	"skill_coverage_score" real,
	"project_depth_score" real,
	"trend_alignment_score" real,
	"consistency_score" real,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap_milestones" (
	"milestone_id" serial PRIMARY KEY NOT NULL,
	"roadmap_id" integer NOT NULL,
	"milestone_title" text NOT NULL,
	"milestone_description" text,
	"sequence_no" integer NOT NULL,
	"estimated_weeks" integer,
	"unlock_rule" text
);
--> statement-breakpoint
CREATE TABLE "roadmap_task_skills" (
	"roadmap_task_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	CONSTRAINT "roadmap_task_skills_roadmap_task_id_skill_id_pk" PRIMARY KEY("roadmap_task_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "roadmap_tasks" (
	"roadmap_task_id" serial PRIMARY KEY NOT NULL,
	"roadmap_id" integer NOT NULL,
	"milestone_id" integer NOT NULL,
	"task_title" text NOT NULL,
	"task_description" text,
	"sequence_no" integer NOT NULL,
	"expected_outcome" text,
	"is_portfolio_eligible" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmaps" (
	"roadmap_id" serial PRIMARY KEY NOT NULL,
	"domain_id" integer NOT NULL,
	"stack_id" integer NOT NULL,
	"roadmap_name" text NOT NULL,
	"difficulty_level" text,
	"version_no" integer DEFAULT 1 NOT NULL,
	"generated_by" text DEFAULT 'System',
	"summary" text,
	"estimated_duration_weeks" integer,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_roadmaps" (
	"student_roadmap_id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"roadmap_id" integer NOT NULL,
	"status" text DEFAULT 'Generated',
	"generated_from_snapshot_id" integer,
	"selected_at" timestamp,
	"activated_at" timestamp,
	"completed_at" timestamp,
	CONSTRAINT "student_roadmaps_student_id_roadmap_id_unique" UNIQUE("student_id","roadmap_id")
);
--> statement-breakpoint
CREATE TABLE "student_task_progress" (
	"task_progress_id" serial PRIMARY KEY NOT NULL,
	"student_roadmap_id" integer NOT NULL,
	"roadmap_task_id" integer NOT NULL,
	"status" text DEFAULT 'Not Started',
	"started_at" timestamp,
	"completed_at" timestamp,
	"linked_project_id" integer,
	"notes" text,
	CONSTRAINT "student_task_progress_student_roadmap_id_roadmap_task_id_unique" UNIQUE("student_roadmap_id","roadmap_task_id")
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_roles" ADD CONSTRAINT "domain_roles_domain_id_domains_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("domain_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_roles" ADD CONSTRAINT "domain_roles_role_id_roles_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_skills" ADD CONSTRAINT "domain_skills_domain_id_domains_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("domain_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_skills" ADD CONSTRAINT "domain_skills_skill_id_skills_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("skill_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_domain_id_domains_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("domain_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stack_skills" ADD CONSTRAINT "stack_skills_stack_id_tech_stacks_stack_id_fk" FOREIGN KEY ("stack_id") REFERENCES "public"."tech_stacks"("stack_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stack_skills" ADD CONSTRAINT "stack_skills_skill_id_skills_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("skill_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tech_stacks" ADD CONSTRAINT "tech_stacks_domain_id_domains_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("domain_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_career_goals" ADD CONSTRAINT "student_career_goals_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_career_goals" ADD CONSTRAINT "student_career_goals_career_goal_id_career_goals_career_goal_id_fk" FOREIGN KEY ("career_goal_id") REFERENCES "public"."career_goals"("career_goal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_domain_preferences" ADD CONSTRAINT "student_domain_preferences_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_domain_preferences" ADD CONSTRAINT "student_domain_preferences_domain_id_domains_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("domain_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_interests" ADD CONSTRAINT "student_interests_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_interests" ADD CONSTRAINT "student_interests_interest_id_interests_interest_id_fk" FOREIGN KEY ("interest_id") REFERENCES "public"."interests"("interest_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_college_id_colleges_college_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("college_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_stack_selections" ADD CONSTRAINT "student_stack_selections_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_stack_selections" ADD CONSTRAINT "student_stack_selections_stack_id_tech_stacks_stack_id_fk" FOREIGN KEY ("stack_id") REFERENCES "public"."tech_stacks"("stack_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_skills" ADD CONSTRAINT "project_skills_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_skills" ADD CONSTRAINT "project_skills_skill_id_skills_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("skill_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_stack_mapping" ADD CONSTRAINT "project_stack_mapping_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_stack_mapping" ADD CONSTRAINT "project_stack_mapping_stack_id_tech_stacks_stack_id_fk" FOREIGN KEY ("stack_id") REFERENCES "public"."tech_stacks"("stack_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_skill_id_skills_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("skill_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_domains" ADD CONSTRAINT "job_domains_job_id_jobs_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("job_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_domains" ADD CONSTRAINT "job_domains_domain_id_domains_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("domain_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_roles" ADD CONSTRAINT "job_roles_job_id_jobs_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("job_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_roles" ADD CONSTRAINT "job_roles_role_id_roles_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_jobs_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("job_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skill_id_skills_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("skill_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("company_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_domain_metrics" ADD CONSTRAINT "trend_domain_metrics_trend_snapshot_id_trend_snapshots_trend_snapshot_id_fk" FOREIGN KEY ("trend_snapshot_id") REFERENCES "public"."trend_snapshots"("trend_snapshot_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_domain_metrics" ADD CONSTRAINT "trend_domain_metrics_domain_id_domains_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("domain_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_skill_metrics" ADD CONSTRAINT "trend_skill_metrics_trend_snapshot_id_trend_snapshots_trend_snapshot_id_fk" FOREIGN KEY ("trend_snapshot_id") REFERENCES "public"."trend_snapshots"("trend_snapshot_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_skill_metrics" ADD CONSTRAINT "trend_skill_metrics_skill_id_skills_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("skill_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_gap_items" ADD CONSTRAINT "readiness_gap_items_readiness_score_id_readiness_scores_readiness_score_id_fk" FOREIGN KEY ("readiness_score_id") REFERENCES "public"."readiness_scores"("readiness_score_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_scores" ADD CONSTRAINT "readiness_scores_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_scores" ADD CONSTRAINT "readiness_scores_domain_id_domains_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("domain_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_scores" ADD CONSTRAINT "readiness_scores_stack_id_tech_stacks_stack_id_fk" FOREIGN KEY ("stack_id") REFERENCES "public"."tech_stacks"("stack_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_scores" ADD CONSTRAINT "readiness_scores_trend_snapshot_id_trend_snapshots_trend_snapshot_id_fk" FOREIGN KEY ("trend_snapshot_id") REFERENCES "public"."trend_snapshots"("trend_snapshot_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_milestones" ADD CONSTRAINT "roadmap_milestones_roadmap_id_roadmaps_roadmap_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("roadmap_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_task_skills" ADD CONSTRAINT "roadmap_task_skills_roadmap_task_id_roadmap_tasks_roadmap_task_id_fk" FOREIGN KEY ("roadmap_task_id") REFERENCES "public"."roadmap_tasks"("roadmap_task_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_task_skills" ADD CONSTRAINT "roadmap_task_skills_skill_id_skills_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("skill_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_tasks" ADD CONSTRAINT "roadmap_tasks_roadmap_id_roadmaps_roadmap_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("roadmap_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_tasks" ADD CONSTRAINT "roadmap_tasks_milestone_id_roadmap_milestones_milestone_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."roadmap_milestones"("milestone_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_domain_id_domains_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("domain_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_stack_id_tech_stacks_stack_id_fk" FOREIGN KEY ("stack_id") REFERENCES "public"."tech_stacks"("stack_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_roadmaps" ADD CONSTRAINT "student_roadmaps_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_roadmaps" ADD CONSTRAINT "student_roadmaps_roadmap_id_roadmaps_roadmap_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("roadmap_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_roadmaps" ADD CONSTRAINT "student_roadmaps_generated_from_snapshot_id_trend_snapshots_trend_snapshot_id_fk" FOREIGN KEY ("generated_from_snapshot_id") REFERENCES "public"."trend_snapshots"("trend_snapshot_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_task_progress" ADD CONSTRAINT "student_task_progress_student_roadmap_id_student_roadmaps_student_roadmap_id_fk" FOREIGN KEY ("student_roadmap_id") REFERENCES "public"."student_roadmaps"("student_roadmap_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_task_progress" ADD CONSTRAINT "student_task_progress_roadmap_task_id_roadmap_tasks_roadmap_task_id_fk" FOREIGN KEY ("roadmap_task_id") REFERENCES "public"."roadmap_tasks"("roadmap_task_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_task_progress" ADD CONSTRAINT "student_task_progress_linked_project_id_projects_project_id_fk" FOREIGN KEY ("linked_project_id") REFERENCES "public"."projects"("project_id") ON DELETE set null ON UPDATE no action;