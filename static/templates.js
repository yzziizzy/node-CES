 
var HB = {};


Handlebars.registerHelper("equals", function(a, b, options) {
	console.log(options)
	if (a == b) { 
		return options.fn(this);
	} else {
		if(typeof options.inverse == 'function') {
			return options.inverse(this);
		}
	}
});


(function() {
	
	var templatesReady = false;
		
	$.getJSON('/templates/all', function(data, status) {
		_.map(data, function(x, k) {
			HB[k] = Handlebars.compile(x.source);
		});
		
		templatesReady = true;
	});
	
	
	
	
	
	
	
})();

