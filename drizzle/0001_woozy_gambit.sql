CREATE TABLE `bugReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(255),
	`description` text,
	`pageUrl` varchar(2048) NOT NULL,
	`screenshotUrl` varchar(1024),
	`consoleLogs` json,
	`networkLogs` json,
	`deviceInfo` json,
	`userActions` json,
	`status` enum('new','in_progress','resolved','closed') NOT NULL DEFAULT 'new',
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`reporterEmail` varchar(320),
	`reporterName` varchar(255),
	`sessionId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bugReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectKey` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`urlPattern` varchar(512),
	`ownerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_projectKey_unique` UNIQUE(`projectKey`)
);
