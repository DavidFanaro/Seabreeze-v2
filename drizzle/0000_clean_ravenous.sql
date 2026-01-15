CREATE TABLE `chat` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text,
	`messages` text,
	`providerId` text,
	`modelId` text,
	`providerMetadata` text,
	`createdAt` integer,
	`updatedAt` integer
);
