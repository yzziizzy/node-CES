


var mysql = require('mysql');


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


app.use('/', serveStatic('./static'));

app.listen(3000, function () {
	console.log('Example app listening on port 3000!')
})





   



