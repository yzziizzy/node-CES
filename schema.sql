 
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


CREATE TABLE IF NOT EXISTS `entities` (
	`eid` INT AUTO_INCREMENT PRIMARY KEY,
	`name` TEXT,
	`entityType` TEXT,
	`deleted` bool not null default false
);



CREATE TABLE IF NOT EXISTS `types` (
	`typeID` INT AUTO_INCREMENT PRIMARY KEY,
	`name` VARCHAR(64),
	`is_double` bool,
	`is_int` bool,
	`is_string` bool,
	`is_date` bool
);
