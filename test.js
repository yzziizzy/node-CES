


var mysql = require('mysql');


var async = require('async');
var Promise = require('bluebird');
var colors = require('colors');
var argv = require('minimist')(process.argv.slice(2));

var config = require('./config');

var express = require('express')
var serveStatic = require('serve-static')
var app = express()

var templates = require('./template_server');
app.use('/templates', templates.router);

var conn = mysql.createPool(config.db);

var CES = require('./index')(config.CES, conn, function(){
	console.log('database initialized');
	
	CES.registerSystem('create', [], {series: true}, function(entity, ces, db, cb) {
		entity.created_at = new Date();
		console.log('adding created at');
		
		cb(null, true);
	});

	CES.registerSystem('create', ['fuzz'], function(entity, ces, db, cb) {
		if(entity.fuzz > 3) {
			entity.cute = 1;
			console.log('marking fuzzy item as cute');
		}
		else {
			entity.scraggly = 1;
			console.log('marking fuzzy item as scraggly');
		}
		
		cb(null, true);
	});
	
	async.series([
		//function(cb) { CES.createType('cost', 'int', cb) },
		//function(cb) { CES.createType('name', 'string', cb) },
		//function(cb) { CES.createType('created_at', 'date', cb) },
		//function(cb) { CES.createType('weight', 'double', cb) },
		
// 		function(cb) { CES.createEntityWithComps('rock', {
// 			cost: 1399,
// 			name: 'cut glass',
// 			created_at: '2017-01-01 03:14:15',
// 			weight: 6.7,
// 		}, cb) },
		
// 		function(cb) { CES.getAllComponents(3, function(err, data) {
// 			console.log(err, data);
// 			cb()
// 		})},
			
		
	], function() {
		
	//	console.log('done');
	});
	
	
	
});


function sendJSON(res) {
	return function(err, data) {
		if(err) {
			res.status(401);
			res.end();
			return;
		}
		
		res.send(JSON.stringify(data || {}))
	}
}



app.all('/types', function(req, res) {
	CES.listTypes(sendJSON(res));
});

app.all('/addType', function(req, res) {
	CES.createType(req.query.name, req.query.dataType, function(err, types) {
		
		if(err) {
			res.status(401);
			res.end();
			return;
		}
		
		CES.listTypes(function(err, types) {
			res.send(JSON.stringify(types));
		});
	});
});

app.all('/entities', function(req, res) {
	CES.listEntities(function(err, entities) {
		res.send(JSON.stringify(entities));
	});
});

app.all('/createEntity', function(req, res) {
	console.log('creating entity', req.query)
	CES.createEntityWithComps(req.query, function(err, entities) {
		res.send(JSON.stringify(entities));
	});
});

app.all('/fetchEntity', function(req, res) {
	CES.getAllComponents(req.query.eid, function(err, entity) {
		res.send(JSON.stringify(entity));
	});
});

app.all('/upsertEntity', function(req, res) {
	CES.setComponentList(req.query.eid, req.query, function(err, entity) {
		res.send(JSON.stringify({}));
	});
});

app.all('/deleteEntity', function(req, res) {
	CES.deleteEntity(req.query.eid, function(err, entity) {
		res.send(JSON.stringify({}));
	});
});

app.all('/findEntitiesWithAllComps', function(req, res) {
	CES.fetchEntitiesWithAllComps(req.query.compNames, sendJSON(res));
});

app.all('/findEntitiesWithAnyComps', function(req, res) {
	CES.fetchEntitiesWithAnyComps(req.query.compNames, sendJSON(res));
});

app.all('/findEntity', function(req, res) {
	CES.findEntity(req.query.fields, sendJSON(res));
});


app.use('/', serveStatic('./static'));

app.listen(3000, function () {
	console.log('Example app listening on port 3000!')
})





   



