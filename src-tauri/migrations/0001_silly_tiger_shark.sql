CREATE TABLE `media_info` (
	`path` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`artist` text,
	`album` text,
	`year` integer,
	`track` integer,
	`total_tracks` integer,
	`disc` integer,
	`total_discs` integer,
	`genre` text,
	`pictures` text,
	`duration` integer,
	`bitrate` integer,
	`sample_rate` integer,
	`channels` integer,
	`bit_depth` integer
);
--> statement-breakpoint
CREATE TABLE `playlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`index` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `playlist_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`path` text NOT NULL,
	`index` integer NOT NULL,
	`playlist_id` integer NOT NULL,
	FOREIGN KEY (`playlist_id`) REFERENCES `playlist`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP TABLE `media_entries`;