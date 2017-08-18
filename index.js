








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
	process.nextTick(function() { cb(err) });
}


module.exports = function(config, db, modCB) {
	
	var types = {};
	var typeNames = {};
	var typeInternal = {};
	var typeExternal = {};
	
	var validActionList = ['create', 'delete', 'presave', 'postsave', 'fetch'];
	
	function prefillActionArrays() {
		var o = {};
		validActionList.map(function(k) { o[k] = []; });
		return o;
	}
	
	var actionHooks = {
		series: prefillActionArrays(),
		parallel: prefillActionArrays(),
	};
	
	function refreshTypes(cb) {
		db.query('SELECT * from `types`;', function(err, data) {
			if(err) return cb(err);
			
			types = Object.create(null); // ids keyed by name
			typeNames = Object.create(null); // names keyed by id
			typeInternal = Object.create(null); // data types keyed by id
			typeExternal = Object.create(null); // external coerced types keyed by id
			
			for(var i = 0; i < data.length; i++) {
				types[data[i].name] = parseInt(data[i].typeID);
				typeNames[parseInt(data[i].typeID)] = data[i].name;
				typeExternal[parseInt(data[i].typeID)] = data[i].externalType;
				
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
	
	function colForCompID(id) {
		return typeToDataCol(typeInternal[id]);
	}
	
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
		_.map(types, function(id, name) {
			list[id] = {
				name: name,
				id: id,
				dataType: typeInternal[id],
				externalType: typeExternal[id],
			};
		});
		
		cb(null, list);
	};
	
	// returns new type id
	CES.createType = function(name, type, externalType, cb) {
		
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
		
		var q = 'INSERT INTO `types` (`name`, `'+tcol+'`, `externalType`) VALUES (?, true, ?);';
		
		db.query(q, [name, externalType], function(err, res) {
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
			typeInternal[id] = type;
		
			cb(null, id);
		});
	}
	
	// used to make sure a schema of sorts exists and is valid
	// does not depend on data caches or application state
	CES.ensureTypes = function(typeInfo, cb) {
// 		format of type info
// 		typeInfo = [
// 			'<componentName>': {
// 				internalType: 'int'|'double'|'string'|'date',
// 				externalType: ''|'int'|'double'|'string'|'date'|'bool'|'json',
// 			}
		
		db.query('SELECT * from `types`;', function(err, data) {
			var cur = _.indexBy(data, 'name');
			var missing = {};
			var wrong = {};
			var wonky = {};
			
			_.map(typeInfo, function(ti, name) {
				if(!cur[name]) {
					missing[name] = ti;
					return;
				}
				
				var c = cur[name];
				var internalType;
				if(c.is_double) internalType = 'double';
				else if(c.is_int) internalType = 'int';
				else if(c.is_string) internalType = 'string';
				else if(c.is_date) internalType = 'date';
				
				if(internalType != ti.internalType) {
					wrong[name] = {cur: c, wanted: ti};
					return;
				}
				
				if(c.externalType != ti.externalType) {
					wonky[name] = {cur: c, wanted: ti};
					return;
				}
			});
			
			// insert the missing ones
			async.parallel(_.map(missing, function(ti, name) {
				return function(acb) {
					CES.createType(name, ti.internalType, ti.externalType || '', acb);
				}
			}), function(err) {
				if(err) return nt(cb, err);
				
				if(Object.keys(wrong).length) err = "wrong data";
				cb(err, wrong, wonky);
			});
			
			
		});
		
		
	}
	
	// returns the new entity id
	CES.listEntities = function(cb) {
		var q = '' + 
			'SELECT ' +
			'	e.*, '+ 
			'	c1.data_string as `name`, ' +
			'	c2.data_string as `type` ' +
			'from `entities` e ' +
			'left join components c1 on e.eid = c1.eid ' +
			'inner join types t1 on c1.typeID = t1.typeID ' +
			'left join components c2 on e.eid = c2.eid ' +
			'inner join types t2 on c2.typeID = t2.typeID ' +
			'WHERE ' +
			'	e.deleted = false ' +
			'	AND t1.name = \'name\' ' +
			'	AND t2.name = \'type\' ' +
			';'
		db.query(q, function(err, res) {
			if(err) return nt(cb, err);
			//console.log(res);
			cb(err, res);
		});
	};
	
	// returns the new entity id
	CES.createEntity = function(cb) {
		//console.log(name, type);
		var q = 'INSERT INTO `entities` (`eid`) VALUES (NULL);';   
		
		db.query(q, function(err, res) {
			//console.log('entity created', err)
			if(err) return nt(cb, err);
			
			// TODO: how does this work again?
			cb(null, res.insertId);
		});
	};
	
	// returns the new entity id
	CES.createEntityWithComps = function(compList, cb) {
		var eid = CES.createEntity( function(err, eid) {
			if(err) return nt(cb, err);
			//console.log('created entity ' + eid)
			
			compList.eid = eid;
			CES.runSystem('create', compList, function(err) {
				CES.setComponentList(eid, compList, function(err2) {
					cb(err, eid);
				});
			});
		});
	};
	
	
	CES.deleteEntity = function(eid, cb) {
		
		var q = 'UPDATE `entities` SET `deleted` = true WHERE `eid` = ?;';
		
		db.query(q, [eid], function(err, res) {
			cb(err);
		});
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
		//console.log("fetching components")
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
	
	
	CES.fetchEntitiesWithAllComps = function(compNames, cb) {
		
		var compIDs = [];
		var joins = [];
		_.map(types, function(v, k) {
			if(-1 === compNames.indexOf(k)) return;
			
			compIDs.push(v);
		});
		
		joins = compIDs.map(function(id, index) {
			var alias = '`c' + index + '`';
			return 'INNER JOIN `components` '+alias+' ON ' +
				'`e`.`eid` = '+alias+'.`eid` AND ' +
				alias+'.`typeID` = ' + Number(id);
		});
		
		var q = '' +
			'SELECT ' +
			'	e.* ' +
			'FROM `entities` e ' +
			joins.join('\n') +
			';';
		
		
		db.query(q, [compIDs], function(err, res) {
			if(err) return nt(cb, err);
			//console.log(res);
			cb(err, res);
		});
		
	}
	
	CES.fetchEntitiesWithAnyComps = function(compNames, cb) {
			

		var sub = '' +
			'SELECT ' +
			'	e.eid ' +
			'FROM `entities` e ' +
			'INNER JOIN `components` c ON e.eid = c.eid ' +
			'WHERE ' +
			'	c.`typeID` IN (?) ' +
			'';
		
		var q = '' +
			'SELECT ' +
			'	c.* ' +
			'FROM components c '+
			'WHERE c.eid IN ('+sub+');'
			
		var compIDs = [];
		_.map(types, function(v, k) {
			if(-1 !== compNames.indexOf(k)) compIDs.push(v);
		});
		
		db.query(q, [compIDs], function(err, res) {
			if(err) return nt(cb, err);
			//console.log(res);
			cb(err, rowsToEntities(res));
		});
		
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
	
	CES.findEntity = function(searchFields, cb) {
		
		var compIDs = [];
		var joins = [];
		var wheres = [];
		var args = [];
		var index = 0;
		_.map(searchFields, function(v, k) {
			var id = types[k];
			if(!id) return;
			
			var alias = '`c' + index + '`';
			joins.push('INNER JOIN `components` '+alias+' ON ' +
				'`e`.`eid` = '+alias+'.`eid` AND ' +
				alias+'.`typeID` = ' + Number(id));
			
			var col = typeToDataCol(typeInternal[id]);
			wheres.push(' '+alias+'.'+col+ ' = ? ');
			
			args.push(v);
			
			index++;
		});
		
		
		
		var sub = '' +
			'SELECT ' +
			'	e.eid ' +
			'FROM `entities` e ' +
			' ' + joins.join('\n') + ' ' + 
			'WHERE ' +
			'	e.`deleted` = false ' +
			'	AND ' + wheres.join(' AND ') +
			'';
		
		var q = '' +
			'SELECT ' +
			'	c.* ' +
			'FROM components c '+
			'WHERE c.eid IN ('+sub+');'
		
		db.query(q, args, function(err, res) {
			if(err) return nt(cb, err);
			
			cb(null, rowsToEntities(res));
		});
		
	};
	
	function rowsToEntities(res) {
		var entities = {};
		
		for(var i = 0; i < res.length; i++) {
			var eid = res[i].eid | 0;
			
			var val = res[i][colForCompID(res[i].typeID)];
			if(typeof entities[eid] != 'object') entities[eid] = {eid: eid};
			entities[eid][typeNames[res[i].typeID]] = val;
		}
		
		return entities;
	}
	// empty/null comp list means any
	CES.registerSystem = function(action, compList, _options, _fn) {
		var fn = _fn,
			options = _options;
		if(typeof options == 'function') {
			options = {}
			fn = _options;
		}
		
		var defaults = {
			filterMode: 'all',
			prefetch: false,
			series: false,
		}
		
		options = Object.assign({}, defaults, options);
		
		var syncMode = options.series ? 'series' : 'parallel';
		
		if(-1 === validActionList.indexOf(action)) {
			console.log('invalid action: ' + action);
			return false;
		}
		
		
		if(!(actionHooks[syncMode][action] instanceof Array)) 
			actionHooks[syncMode][action] = [];
		
		var cl = null;
		if(compList instanceof Array && compList.length) cl = compList.slice();
		
		actionHooks[syncMode][action].push({
			comps: cl,
			mode: options.filterMode,
			fn: fn,
		});
		
	};
	
	function hasAllComps(entity, compList) { 
		for(var i = 0; i < compList.length; i++) {
			if(!Object.prototype.hasOwnProperty.call(entity, compList[i])) 
				return false;
		}
		
		return true;
	}
	
	function hasAnyComps(entity, compList) { 
		for(var i = 0; i < compList.length; i++) {
			if(Object.prototype.hasOwnProperty.call(entity, compList[i])) 
				return true;
		}
		
		return false;
	}
	
	function hasComps(mode, entity, compList) {
		return {
			any: hasAnyComps,
			all: hasAllComps,
		}[mode](entity, compList);
	}
	
	// mutates entity
	CES.runSystem = function(action, entity, cb) {
		var hooksSeries = actionHooks.series[action];
		var hooksParallel = actionHooks.parallel[action];
		
		var dirty = false;
		
		async.mapSeries(hooksSeries, function(h, acb) {
			if(h.comps !== null && !hasComps(h.mode, entity, h.comps)) {
				return acb(null);
			}
			
			// TODO: pass in db transaction rather than raw db 
			h.fn(entity, CES, db, function(err, d) {
				dirty = dirty || d;
				acb(err);
			});
			
		}, function(err) {
			if(err) return cb(err);
			
			async.map(hooksParallel, function(h, acb) {
				if(h.comps !== null && !hasComps(h.mode, entity, h.comps)) {
					return acb(null);
				}
				
				h.fn(entity, CES, db, function(err, d) {
					dirty = dirty || d;
					acb(err);
				});
				
			}, function(err) {
				cb(err, dirty);
			});
		});
		
	};
	
	
	// user auth info is stroed independently so it isn't accidentally leaked
	// don't store passwords or sesitive credentials in normal components
	CES.createUser = function(status, cb) {
		
		var q = 'INSERT INTO `users` (`status`, `joinedAt`, `lastLoginAt`) VALUES (?, NOW(), NULL);';
		
		db.query(q, [status], function(err, res) {
			cb(err, res ? parseInt(res.insertId) : null);
		});
	};

	CES.getUser = function(uid, cb) {
		var q = 'SELECT * FROM `users` WHERE `uid` = ?;';
		db.query(q, [uid], cb);
	};
	
	CES.setUserStatus = function(uid, status, cb) {
		var q = 'UPDATE `users` SET `status` = ? WHERE uid = ?;'
		db.query(q, [status, uid], cb);
	};
	
	CES.updateUserLogin = function(uid, cb) {
		var q = 'UPDATE `users` SET `lastLoginAt` = NOW() WHERE uid = ?;'
		db.query(q, [uid], cb);
	};

	CES.addUserClaim = function(claim, cb) {
		var q = 'INSERT INTO `user_claims` ( '+
			'	`uid`, '+
			'	`type`, '+
			'	`status`, '+
			'	`providerID`, '+ 
			'	`authData`, ' +
			'	`activatedAt`, ' +
			'	`lastLoginAt` ' +
			') VALUES (?,?,?,?,?, NOW(), NULL);';
			
		db.query(q, [
			claim.uid,
			claim.type,
			claim.status,
			claim.providerID,
			claim.authData,
		], cb);
	};
	
	CES.updateUserClaimLogin = function(uid, claimType, cb) {
		var q = 'UPDATE `user_claims` SET `lastLoginAt` = NOW() WHERE `uid` = ? AND `type` = ?;'
		db.query(q, [uid, claimType], cb);
	};

	CES.updateUserClaimStatus = function(uid, claimType, status, cb) {
		var q = 'UPDATE `user_claims` SET `status` = ? WHERE `uid` = ? AND `type` = ?;'
		db.query(q, [status, uid, claimType], cb);
	};
	
	CES.updateUserClaimData = function(uid, claimType, authData, cb) {
		var q = 'UPDATE `user_claims` SET `authData` = ? WHERE `uid` = ? AND `type` = ?;'
		db.query(q, [authData, uid, claimType], cb);
	};
	
	CES.getUserClaims = function(uid, cb) {
		var q = 'SELECT * FROM `user_claims` WHERE `uid` = ?;'
		db.query(q, [uid], cb);
	};

	CES.getUserClaimByProvider = function(providerID, claimType, cb) {
		var q = 'SELECT * FROM `user_claims` WHERE `providerID` = ? AND `type` = ?;'
		db.query(q, [providerID, claimType], function(err, row) {
			if(err) return cb(err);
			if(!row.length) return cb(new Error("claim '"+claimType+"' not found for providerID '"+providerID+"'"));
			cb(null, row[0]);
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


































