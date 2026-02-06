CREATE TABLE `chat` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text,
	`messages` text NOT NULL,
	`thinkingOutput` text NOT NULL,
	`providerId` text NOT NULL,
	`modelId` text NOT NULL,
	`providerMetadata` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
