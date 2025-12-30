CREATE TABLE `chat` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text,
	`messages` text
);
--> statement-breakpoint
DROP TABLE `setting`;