

var argv = require('minimist')(process.argv.slice(2));


var async = require('async');
var mysql = require('mysql');
var fs = require('fs');

var conn = mysql.createConnection({
	host     : argv.host || 'localhost',
	user     : argv.user || 'root',
	password : argv.pass || 'pass',
	multipleStatements: true,
});




function quit() {
	
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
		console.log('dropping database ' + db);
		conn.query('DROP DATABASE `'+db+'`;', errcb(cb))
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
	

if(argv.create) {
	async.series([
		createdb(argv.reset),
		usedb(argv.reset),
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
