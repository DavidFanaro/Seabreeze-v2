CREATE TABLE `chat` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text,
	`messages` text,
	`thinkingOutput` text,
	`providerId` text,
	`modelId` text,
	`providerMetadata` text,
	`createdAt` integer,
	`updatedAt` integer
);
