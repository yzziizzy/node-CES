








var Promise = require('bluebird');
var async = require('async');
var dbutils = require('./dbutils');






/*

idea:
systems can register to be run whenever certain components are created, modified, or deleted
they would be run normally, as for all entities/components

perhaps another way is to have a system be able to run at certain intervals or threshholds
   with just the changed components/entities

alternately, systems could specify to run only for components that match some sql conditions,
   perhaps just a basic set of </>/= conditions



*/

/*


schema:

	create table `components_double` (
	`eid` INT,
	`typeID` INT,
	`data` double,
	`rev` int,
	PRIMARY KEY (`eid`, `typeID`)
	);

create table `components_int` (
	`eid` INT,
	`typeID` INT,
	`data` BIGINT,
	`rev` int,
	PRIMARY KEY (`eid`, `typeID`)
	);

create table `components_string` (
	`eid` INT,
	`typeID` INT,
	`data` VARCHAR(31000),
	`rev` int,
	PRIMARY KEY (`eid`, `typeID`)
	);

create table `components_date` (
	`eid` INT,
	`typeID` INT,
	`data` timestamp with timezone,
	`rev` int,
	PRIMARY KEY (`eid`, `typeID`)
	);
	
CREATE INDEX components_eid ON components (eid);
CREATE INDEX components_eid_typeID ON components (eid, typeID);

create table `entities` (
	`eid` SERIAL PRIMARY KEY,
	`name` TEXT,
	`entityType` TEXT
	`deleted` bool not null default false
	);

CREATE INDEX entities_eid ON entities (eid);

create table `types` (
	`typeID` SERIAL PRIMARY KEY,
	`name` VARCHAR(64),
	`is_double` bool,
	`is_int` bool,
	`is_string` bool,
	`is_date` bool
	);


*/




// TODO TODO TODO

// getEntityWithComponentValue(compType, value, cb);


module.exports = function(config, db, modCB) {
	
	var types = null;
	var typeNames = null;
	
	
	function refreshTypes(cb) {
		db.query('SELECT * from `types`;', function(err, data) {
			if(err) return cb(err);
			
			types = Object.create(null);
			typeNames = Object.create(null);
			
			for(var i = 0; i < data.length; i++) {
				types[data[i].name] = parseInt(data[i].typeID);
				typeNames[parseInt(data[i].typeID)] = data[i].name;
			}
			
			cb(null);
		});
	};
	
	
	
	var CES = {};
	
	
	// returns the new entity id
	CES.createEntity = function(name, type, cb) {
		
		var q = 'INSERT INTO `entities` (`name`, `entityType`) VALUES (?, ?);';   
		
		db.query(q, [name, type], function(err, res) {
			if(err) return nt(cb, err);
			
			// TODO: how does this work again?
			cb(null, res.eid);
		});
	};
	
	// returns the new entity id
	CES.createEntityWithComps = function(name, compList, cb) {
		var eid = CES.createEntity(name, function(err, eid) {
			if(err) return nt(cb, err);
			
			CES.setComponentList(eid, compList, function(err2) {
				cb(err, eid);
			});
		});
		
	};
	
	
	CES.deleteEntity = function(eid, cb) {
		
		var del1 = 'DELETE FROM `components` WHERE `eid` = ?;';
		var del2 = 'DELETE FROM `entities` WHERE `eid` = ?;';
		
		function work(trandb, rollback, commit) {
				
			trandb.query(del1, [eid], function(err, res) {
				if(err) return rollback(err);
				
				trandb.query(del2, [eid], function(err, res) {
					if(err) return rollback(err);
				
					commit();
				});
			});
		};
		
		dbutil.trans(db, work, cb);
	};
	
	CES.getComponent = function(eid, comp, cb) {
		
		var q = '' +
		'	SELECT ' +
		'		t.`name`, ' +
		'		c.`data` ' +
		'	FROM `components` c ' +
		'	LEFT JOIN `types` t ON c.`typeID` = t.`typeID` ' +
		'	WHERE ' +
		'		c.`eid` = ? ' +
		'		AND c.`typeID` = ?;';
	
		db.query(q, [eid], function(err, res) {
			if(err) return nt(cb, err);
			
			var list = Object.create(null);
			list.eid = eid;
			
			for(var i = 0; i < res.rows.length; i++) {
				list[res.rows[i].name] = JSON.parse(res.rows[i].data);
				// TODO: how does this work again?
			}
			
			cb(null, list);
		});
		
	};

	CES.getAllComponents = function(eid, cb) {
		
		var q = '' +
		'	SELECT ' +
		'		t.`name`, ' +
		'		c.`data` ' +
		'	FROM `components` c ' +
		'	LEFT JOIN `types` t ON c.`typeID` = t.`typeID`' +
		'	WHERE `eid` = ?;';
	
		db.query(q, [eid], function(err, res) {
			if(err) return nt(cb, err);
			
			var list = Object.create(null);
			list.eid = eid;
			
			for(var i = 0; i < res.rows.length; i++) {
				list[res.rows[i].name] = JSON.parse(res.rows[i].data);
				// TODO: how does this work again?
			}
			
			cb(null, list);
		});
		
	};

	CES.setComponent = function(eid, comp, value, cb) {
		
		var ins = 'REPLACE INTO `components` (`eid`, `typeID`, `data`) VALUES (?, ?, ?);';
		
		// BUG: need dynamic comp updating
		var typeID = types[comp];
		
		db.query(ins, [eid, typeID, value], cb);
	};
	
	// HACK not exactly efficient...
	CES.setComponentList = function(eid, compList, cb) {
		
		async.parallel(_.map(compList, function(value, comp) {
			return function(acb) {
				CES.setComponent(eid, comp, value, acb);
			}
		}));
	};
	
	
	CES.removeComponent = function(eid, comp, cb) {
		
		// HACK this function is sloppy copypasta
		
		var del = 'DELETE FROM `components` WHERE `eid` = ? AND `typeID` = ?;';
		
		// BUG: need dynamic comp updating
		var typeID = types[comp];
		
		function work(trandb, rollback, commit) {
				
			trandb.query(del, [eid, typeID], function(err, res) {
				if(err) return rollback(err);
				
				commit();
			});
		};
		
		dbutil.trans(db, work, cb);
	};
	
	
	// not working
	CES.findEntityBy= function(comp, value, cb) {
		
		var q = '' +
		'	SELECT ' +
		'		t.`name`, ' +
		'		c.`data` ' +
		'	FROM `components` c ' +
		'	LEFT JOIN `types` t ON c.`typeID` = t.`typeID`' +
		'	WHERE `eid` = ?;';
	
		db.query(q, [eid], function(err, res) {
			if(err) return nt(cb, err);
			
			var list = Object.create(null);
			list.eid = eid;
			
			for(var i = 0; i < res.rows.length; i++) {
				list[res.rows[i].name] = JSON.parse(res.rows[i].data);
				// TODO: how does this work again?
			}
			
			cb(null, list);
		});
		
		
	};
	
	
// 	CES.runSystem = function(comp, sysFn) {
// 		var comps = components[comp];
// 		if(!comps) return 0;
// 		
// 		var cnt = 0;
// 		for(var eid in comps) {
// 			var ent = CES.getAllComponents(eid);
// 			sysFn(ent, eid);
// 			
// 			cnt++;
// 		}
// 		return cnt;
// 	}
	
	
	return CES;

};

































