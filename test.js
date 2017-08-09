


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
	
	async.series([
		//function(cb) { CES.createType('cost', 'int', cb) },
		//function(cb) { CES.createType('name', 'string', cb) },
		//function(cb) { CES.createType('created_at', 'date', cb) },
		//function(cb) { CES.createType('weight', 'double', cb) },
		
		function(cb) { CES.createEntityWithComps('rock', {
			cost: 1399,
			name: 'cut glass',
			created_at: '2017-01-01 03:14:15',
			weight: 6.7,
		}, cb) },
		
		function(cb) { CES.getAllComponents(3, function(err, data) {
			console.log(err, data);
			cb()
		})},
			
		
	], function() {
		
		console.log('done');
	});
	
	
	
});




app.all('/types', function(req, res) {

	CES.listTypes(function(err, types) {
		res.send(types);
	});

});
app.all('/entities', function(req, res) {

	CES.listEntities(function(err, entities) {
		res.send(JSON.stringify(entities));
	});

});
app.all('/newEntity', function(req, res) {
// 	console.log(req);
	CES.createEntity(req.query.name, 'foo', function(err, entities) {
		res.send(JSON.stringify(entities));
	});

});

app.all('/fetchEntity', function(req, res) {
// 	console.log(req);
	CES.getAllComponents(req.query.eid, function(err, entity) {
		res.send(JSON.stringify(entity));
	});

});


app.use('/', serveStatic('./static'));

app.listen(3000, function () {
	console.log('Example app listening on port 3000!')
})





   



