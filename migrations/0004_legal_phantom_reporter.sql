ALTER TABLE "activities" ALTER COLUMN "group_id" TYPE integer USING "group_id"::integer;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activities_group_id_groups_id_fk') THEN
  ALTER TABLE "activities" ADD CONSTRAINT "activities_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE cascade;
 END IF;
END $$;