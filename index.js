








var Promise = require('bluebird');
var async = require('async');
var _ = require('underscore');




/*

idea:
systems can register to be run whenever certain components are created, modified, or deleted
they would be run normally, as for all entities/components

perhaps another way is to have a system be able to run at certain intervals or threshholds
   with just the changed components/entities

alternately, systems could specify to run only for components that match some sql conditions,
   perhaps just a basic set of </>/= conditions



*/




// TODO TODO TODO

// getEntityWithComponentValue(compType, value, cb);

function nt(cb, err) {
	console.log(err);
	cb(err);
}


module.exports = function(config, db, modCB) {
	
	var types = null;
	var typeNames = null;
	var typeInternal = null;
	
	
	function refreshTypes(cb) {
		db.query('SELECT * from `types`;', function(err, data) {
			if(err) return cb(err);
			
			types = Object.create(null);
			typeNames = Object.create(null);
			typeInternal = Object.create(null);
			
			for(var i = 0; i < data.length; i++) {
				types[data[i].name] = parseInt(data[i].typeID);
				typeNames[parseInt(data[i].typeID)] = data[i].name;
				
				var dtype;
				if(data[i].is_double) dtype = 'double';
				else if(data[i].is_int) dtype = 'int';
				else if(data[i].is_string) dtype = 'string';
				else if(data[i].is_date) dtype = 'date';
				 
				typeInternal[parseInt(data[i].typeID)] = dtype;
			}
			
			cb(null);
		});
	};
	
	function typeToBoolCol(str) {
		return {
			'double': 'is_double',
			'string': 'is_string',
			'int': 'is_int',
			'date': 'is_date',
		}[str];
	}
	
	function typeToDataCol(str) {
		return {
			'double': 'data_double',
			'string': 'data_string',
			'int': 'data_int',
			'date': 'data_date',
		}[str];
	}
	
	var CES = {};
	
	// return a copy of the type list
	CES.listTypes = function(cb) {
		var list = {};
		Object.assign(list, types);
		cb(null, list);
	};
	
	// returns new type id
	CES.createType = function(name, type, cb) {
		
		name = name.replace(/^\s+/, '').replace(/\s+$/, '');
		if(name == '') {
			return nt(cb, "no type name given");
		}
		
		// neutered to test the db version of this
		if(types[name]) {
			return nt(cb, "Type name already exists.")
		}
		
		var tcol = {
			'double': 'is_double',
			'string': 'is_string',
			'int': 'is_int',
			'date': 'is_date',
		}[type];
		
		var q = 'INSERT INTO `types` (`name`, `'+tcol+'`) VALUES (?, true);';
		
		db.query(q, [name], function(err, res) {
			if(err) {
				if(err.code == 'ER_DUP_ENTRY') {
					return nt(cb, "type name already exists.");
				}
				
				return nt(cb, err);
			}
			
			var id = parseInt(res.insertId);
			
			// update the local type lookups
			types[name] = id;
			typeNames[id] = name;
			
			cb(null, id);
		});
	}
	
	
	// returns the new entity id
	CES.listEntities = function(cb) {
		var q = 'SELECT * from `entities`;';
		db.query(q, function(err, res) {
			if(err) return nt(cb, err);
			console.log(res);
			cb(err, res);
		});
	};
	
	// returns the new entity id
	CES.createEntity = function(name, type, cb) {
		console.log(name, type);
		var q = 'INSERT INTO `entities` (`name`, `entityType`) VALUES (?, ?);';   
		
		db.query(q, [name, type], function(err, res) {
			console.log('entity created', err)
			if(err) return nt(cb, err);
			
			// TODO: how does this work again?
			cb(null, res.insertId);
		});
	};
	
	// returns the new entity id
	CES.createEntityWithComps = function(name, compList, cb) {
		var eid = CES.createEntity(name, 'unspecified', function(err, eid) {
			if(err) return nt(cb, err);
			console.log('created entity ' + eid)
			
			CES.setComponentList(eid, compList, function(err2) {
				cb(err, eid);
			});
		});
		
	};
	
	
	CES.deleteEntity = function(eid, cb) {
		
		var del =[
			'DELETE FROM `components` WHERE `eid` = ?;',
			'DELETE FROM `entities` WHERE `eid` = ?;',
		];
		
		function work(trandb, rollback, commit) {
			
			async.map(del, function(x, acb) {
				trandb.query(x, [eid], acb);
			}, 
			function(err) {
				if(err) return rollback(err);
				commit();
			});
		};
		
		dbutil.trans(db, work, cb);
	};
	
	CES.getComponent = function(eid, compName, cb) {
		
		var q = '' +
		'	SELECT ' +
		'		t.`name`, ' +
		'		c.`data_double`, ' +
		'		c.`data_int`, ' +
		'		c.`data_date`, ' +
		'		c.`data_string`, ' +
		'		t.`is_double`, ' +
		'		t.`is_int`, ' +
		'		t.`is_date`, ' +
		'		t.`is_string` ' +
		'	FROM `types` t ' +
		'	LEFT JOIN `components` c ON c.`typeID` = t.`typeID` ' +
		'	WHERE ' +
		'		c.`eid` = ? ' +
		'		AND t.`name` = ?;';
	
		var typeId = types[compName];
		if(!typeId) {
			return nt(cb, "no such component");
		}
		
		db.query(q, [eid, compName], function(err, res) {
			if(err) return nt(cb, err);
			
			var list = Object.create(null);
			list.eid = eid;
			
			for(var i = 0; i < res.rows.length; i++) {
				var data;
				var row = res.rows[i];
				
				if(row.is_double) data = data_double;
				else if(row.is_int) data = data_int;
				else if(row.is_date) data = data_date;
				else if(row.is_string) data = data_string;
				
				list[row.name] = data;
			}
			
			cb(null, list);
		});
		
	};

	CES.getAllComponents = function(eid, cb) {
		console.log("fetching components")
		var q = '' +
		'	SELECT ' +
		'		t.`name`, ' +
		'		c.`data_double`, ' +
		'		c.`data_int`, ' +
		'		c.`data_date`, ' +
		'		c.`data_string`, ' +
		'		t.`is_double`, ' +
		'		t.`is_int`, ' +
		'		t.`is_date`, ' +
		'		t.`is_string` ' +
		'	FROM `components` c ' +
		'	LEFT JOIN `types` t ON c.`typeID` = t.`typeID` ' +
		'	WHERE c.`eid` = ?;';
	
		db.query(q, [eid], function(err, res) {
			if(err) return nt(cb, err);
			
			if(!res) {
				console.log('no components found');
				return cb(null, {});
			}
				 
			var list = Object.create(null);
			list.eid = eid;
			
			for(var i = 0; i < res.length; i++) {
				var data;
				var row = res[i];
				
				if(row.is_double) data = row.data_double;
				else if(row.is_int) data = row.data_int;
				else if(row.is_date) data = row.data_date;
				else if(row.is_string) data = row.data_string;
				
				list[row.name] = data;
			}
			
			cb(null, list);
		});
		
	};

	
	
	CES.fetchEntitesByID = function(eids, cb) {
		
		
		var q = '' +
		'	SELECT ' +
		'		c.`eid`, ' +
		'		t.`name`, ' +
		'		c.`data_double`, ' +
		'		c.`data_int`, ' +
		'		c.`data_date`, ' +
		'		c.`data_string`, ' +
		'		t.`is_double`, ' +
		'		t.`is_int`, ' +
		'		t.`is_date`, ' +
		'		t.`is_string` ' +
		'	FROM `components` c ' +
		'	LEFT JOIN `types` t ON c.`typeID` = t.`typeID` ' +
		'	WHERE c.`eid` IN ?;';
	
		db.query(q, [eids], function(err, res) {
			if(err) return nt(cb, err);
			
			if(!res) {
				console.log('no components found');
				return cb(null, {});
			}
			
			var entities = {};
			
			var list = Object.create(null);
			list.eid = eid;
			
			for(var i = 0; i < res.length; i++) {
				var data;
				var row = res[i];
				
				if(row.is_double) data = row.data_double;
				else if(row.is_int) data = row.data_int;
				else if(row.is_date) data = row.data_date;
				else if(row.is_string) data = row.data_string;
				
				list[row.name] = data;
			}
			
			cb(null, list);
		});
		
	};
	
	
	
	
	CES.setComponent = function(eid, comp, value, cb) {
		
		var typeID = types[comp];
		var dcol = typeToDataCol(typeInternal[typeID]);
		
		var ins = 'REPLACE INTO `components` (`eid`, `typeID`, `'+dcol+'`) VALUES (?, ?, ?);';
		
		db.query(ins, [eid, typeID, value], cb);
	};
	
	// HACK not exactly efficient...
	CES.setComponentList = function(eid, compList, cb) {
		
		async.parallel(_.map(compList, function(value, comp) {
			return function(acb) {
				CES.setComponent(eid, comp, value, acb);
			}
		}), cb);
	};
	
	
	CES.removeComponent = function(eid, comps, cb) {
		
		var del = 'DELETE FROM `components` WHERE `eid` = ? AND `typeID` = ?;';
		var typeID = types[comp];
		
		db.query(del, [eid, typeID], function(err, res) {
			if(err) return nt(cb, err);
			cb(null);
		});
	};
	
	
	// not working
	CES.fetchEntitiesWithComps = function(compNames, cb) {
		
		
	};
	
	
	// not working
	CES.findEntityBy = function(comp, value, cb) {
		
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
	
	
	
	
	
	
	
	
	refreshTypes(modCB);
	
	
	
	return CES;

};


































