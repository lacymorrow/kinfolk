CREATE TABLE "db_event_person" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"person_id" varchar(255) NOT NULL,
	"role" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "db_kinfolk_event" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"family_id" varchar(255),
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date" text,
	"location" text,
	"created_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "db_kinfolk_post" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"family_id" varchar(255),
	"author_id" varchar(255),
	"title" text,
	"body" text NOT NULL,
	"pinned" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "db_kinfolk_photo_tag" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"photo_id" varchar(255) NOT NULL,
	"person_id" varchar(255),
	"event_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "db_kinfolk_photo" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"family_id" varchar(255),
	"uploaded_by" varchar(255),
	"url" text NOT NULL,
	"thumbnail_url" text,
	"caption" text,
	"taken_at" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "db_event_person" ADD CONSTRAINT "db_event_person_event_id_db_kinfolk_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."db_kinfolk_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_event_person" ADD CONSTRAINT "db_event_person_person_id_db_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."db_person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_kinfolk_event" ADD CONSTRAINT "db_kinfolk_event_family_id_db_family_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."db_family"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_kinfolk_event" ADD CONSTRAINT "db_kinfolk_event_created_by_db_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."db_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_kinfolk_post" ADD CONSTRAINT "db_kinfolk_post_family_id_db_family_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."db_family"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_kinfolk_post" ADD CONSTRAINT "db_kinfolk_post_author_id_db_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."db_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_kinfolk_photo_tag" ADD CONSTRAINT "db_kinfolk_photo_tag_photo_id_db_kinfolk_photo_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."db_kinfolk_photo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_kinfolk_photo_tag" ADD CONSTRAINT "db_kinfolk_photo_tag_person_id_db_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."db_person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_kinfolk_photo_tag" ADD CONSTRAINT "db_kinfolk_photo_tag_event_id_db_kinfolk_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."db_kinfolk_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_kinfolk_photo" ADD CONSTRAINT "db_kinfolk_photo_family_id_db_family_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."db_family"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_kinfolk_photo" ADD CONSTRAINT "db_kinfolk_photo_uploaded_by_db_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."db_user"("id") ON DELETE no action ON UPDATE no action;