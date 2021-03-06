
/*
CREATE TABLE IF NOT EXISTS `components_double` (
	`eid` INT,
	`typeID` INT,
	`data` double,
	`rev` int,
	PRIMARY KEY (`eid`, `typeID`)
);

CREATE TABLE IF NOT EXISTS `components_int` (
	`eid` INT,
	`typeID` INT,
	`data` BIGINT,
	`rev` int,
	PRIMARY KEY (`eid`, `typeID`)
);

CREATE TABLE IF NOT EXISTS `components_string` (
	`eid` INT,
	`typeID` INT,
	`data` VARCHAR(31000),
	`rev` int,
	PRIMARY KEY (`eid`, `typeID`)
);

CREATE TABLE IF NOT EXISTS `components_date` (
	`eid` INT,
	`typeID` INT,
	`data` timestamp,
	`rev` int,
	PRIMARY KEY (`eid`, `typeID`)
);

*/

CREATE TABLE IF NOT EXISTS `components` (
	`eid` INT,
	`typeID` INT,
	`data_double` double,
	`data_int` BIGINT,
	`data_string` VARCHAR(31000),
	`data_date` timestamp,
	`rev` int default 1,
	PRIMARY KEY (`eid`, `typeID`)
);

CREATE TABLE IF NOT EXISTS `entities` (
	`eid` INT AUTO_INCREMENT PRIMARY KEY,
	`deleted` bool not null default false
);



CREATE TABLE IF NOT EXISTS `types` (
	`typeID` INT AUTO_INCREMENT PRIMARY KEY,
	`name` VARCHAR(64),
	`is_double` bool default false,
	`is_int` bool default false,
	`is_string` bool default false,
	`is_date` bool default false,
	`externalType` VARCHAR(64) default '',
	unique(`name`)
);

INSERT INTO `types` (`name`, `is_string`) VALUES ('name', true);
INSERT INTO `types` (`name`, `is_date`) VALUES ('created_at', true);
INSERT INTO `types` (`name`, `is_date`) VALUES ('updated_at', true);
INSERT INTO `types` (`name`, `is_date`) VALUES ('deleted_at', true);


CREATE TABLE IF NOT EXISTS `users` (
	`uid` INT AUTO_INCREMENT PRIMARY KEY,
	`status` VARCHAR(32),
	`joinedAt` timestamp not null,
	`lastLoginAt` timestamp
);

CREATE TABLE IF NOT EXISTS `user_claims` (
	`uid` INT,
	`type` VARCHAR(32),
	`status` VARCHAR(32),
	`providerID` VARCHAR(1024),
	`authData` VARCHAR(1024),
	`activatedAt` timestamp,
	`lastLoginAt` timestamp,
	PRIMARY KEY (`uid`, `type`)
);


