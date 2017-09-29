

var argv = require('minimist')(process.argv.slice(2));


var async = require('async');
var mysql = require('mysql');
var fs = require('fs');
var util = require('util');

var conn = mysql.createConnection({
	host     : argv.host || 'localhost',
	user     : argv.user || 'root',
	password : argv.pass || 'pass',
	multipleStatements: true,
});




function quit(err) {
	if(err) console.log(err);
	conn.end();
}

function errcb(cb) {
	return function(err) {
		if(err) console.log(err);
		cb(err);
	}
}

function usedb(db) {
	return function(cb) {
		conn.query('use `'+db+'`;', errcb(cb))
	}
}

function createdb(db) {
	return function(cb) {
		console.log("creating database " + db);
		conn.query('CREATE DATABASE IF NOT EXISTS `'+db+'`;', errcb(cb))
		console.log('    done');
	}
}
	
function dropdb(db) {
	return function(cb) {
		console.log('dropping CES tables in database ' + db);
		conn.query(
			'DROP TABLE IF EXISTS `components`; ' +
			'DROP TABLE IF EXISTS `entities`; ' +
			'DROP TABLE IF EXISTS `types`; '
			'DROP TABLE IF EXISTS `user_claims`; '
			'DROP TABLE IF EXISTS `users`; '
			, errcb(cb))
		console.log('    done');
	}
}

function initdb() {
	return function(cb) {
		console.log('initializing database...');
		var schema = fs.readFileSync('./schema.sql', 'utf-8'); 
		conn.query(schema, errcb(cb));
		
		console.log('    done');
	}
}


function intType(row) {
	if(row.is_double) return 'double';
	if(row.is_int) return 'int';
	if(row.is_string) return 'string';
	if(row.is_date) return 'date';
	return 'unknown';
}

function dumpData(filename) {
	return function(cb) {
		console.log('dumping database...');
		
		var data = {};
		
		async.series([
			
			function(acb) {
				// dump types
				conn.query('SELECT * from types;', function(err, rows) {
					if(err) return acb(err);
					data.types = {};
					
					for(var i = 0; i < rows.length; i++) {
						var r = rows[i];
						
						data.types[r.typeID] = {
							typeID: r.typeID,
							name: r.name,
							internalType: intType(r),
							externalType: r.externalType,
						};
					}
					
					acb();
				});
			},
			function(acb) {
				// dump types
				conn.query('SELECT * from components;', function(err, rows) {
					if(err) return acb(err);
					data.components = {};
					
					function extractData(row, typeid) {
						var t = data.types[typeid].internalType;
						if(t == 'double') return row.data_double;
						if(t == 'int') return row.data_int;
						if(t == 'string') return row.data_string;
						if(t == 'date') return row.data_date;
					}
					
					for(var i = 0; i < rows.length; i++) {
						var r = rows[i];
						
						data.components[r.typeID] = {
							eid: r.eid,
							typeID: r.typeID,
							data: extractData(r, r.typeID),
						};
					}
					
					acb();
				});
			},
		],
		function(err) {
			if(err) return cb(err);
			
			fs.writeFileSync(filename, JSON.stringify(data, false, 2)); 
			
			console.log('    done');
			cb();
		});
	}
}
	

function loadData(filename) {
	return function(cb) {
		console.log('loading database...');
		
		var data = JSON.parse(fs.readFileSync(filename, 'utf-8'));
		
		async.series([
			
			function(acb) {
				// load types
				async.mapSeries(data.types, function(type, bcb) {
					var d = [
						type.typeID,
						type.name,
						type.internalType == 'double',
						type.internalType == 'int',
						type.internalType == 'string',
						type.internalType == 'date',
						type.externalType
					];
					var q = 'REPLACE INTO types (`typeID`, `name`, `is_double`, `is_int`, `is_string`, `is_date`, `externalType`) VALUES (?,?,?,?,?,?,?);'
					conn.query(q, d, bcb);
				}, acb);
			},
			function(acb) {
				// load components
				async.mapSeries(data.components, function(comp, bcb) {
					var d = [
						comp.eid,
						comp.typeID,
						comp.data,
					];
					
					var type = data.types[comp.typeID]
					
					var q = 'REPLACE INTO components (`eid`, `typeID`, `data_'+type.internalType+'`) VALUES (?,?,?);'
					conn.query(q, d, bcb);
				}, acb);
			},
		],
		function(err) {
			console.log('    done');
			cb()
		});
	}
}
	

if(argv.create) {
	async.series([
		createdb(argv.create),
		usedb(argv.create),
		initdb(),
	], quit);
}

if(argv.reset) {
	async.series([
		dropdb(argv.reset),
		createdb(argv.reset),
		usedb(argv.reset),
		initdb(),
	], quit);
	
}

if(argv.dump) {
	async.series([
		usedb(argv.dump),
		dumpData(argv._[0]),
		
	], quit);
}

if(argv.load) {
	async.series([
		usedb(argv.load),
		loadData(argv._[0]),
		
	], quit);
	
}
