

var Promise = require('bluebird');
var async = require('async');
var fs = require('fs');
var crypto = require('crypto');
var Path = require('path');

var HB = require('handlebars');

var express = require('express');
var route = express.Router();

var tempFilter= new RegExp('\.html$', 'i');


var templates = {};

function refresh() {
	
	var tmps = {};
	
	listDir('./templates', tmps);
	
	templates = tmps;
}

function listDir(path, out) {
	
	return fs.readdirSync(path).map(function(filename) {
		
		var p = Path.join(path, filename);
		
		var s = fs.statSync(p);
		if(s.isDirectory()) {
			listDir(p, out);
		}
		if(s.isFile() && tempFilter.test(filename)) {
			out[p] = loadTemplate(p);
		}
	})
}

function loadTemplate(p) {
	var src = fs.readFileSync(p, 'utf-8');
	return {
		hash: crypto.createHash('sha1').update(src).digest('hex'),
		filepath: p,
		template: HB.precompile(src),
	};
}


refresh();


route.all('/fetch', function(req, res) {
	res.send(JSON.stringify(templates[req.params.name]));
});

route.all('/all', function(req, res) {
	res.send(JSON.stringify(templates));
});

route.all('/tree/*', function(req, res) {
	
	
	
});













module.exports = {
	router: route,
	refresh: refresh,
	
};



























