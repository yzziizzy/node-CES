var CES = {};

(function() { 
		
	CES.allEntities = function(cb) {
		$.getJSON('/entities', function(data, status) {
			if(status != 'success') {
				console.log("failed to fetch all entities with status code " + status);
				cb(err);
			}
			//console.log(data);
			cb(null, data);
		})
	};
	
	
	CES.fetchEntity = function(eid, cb) {
		$.getJSON('/fetchEntity', {eid: eid}, function(data, status) {
			if(status != 'success') {
				console.log("failed to fetch entity #"+eid+" with status code " + status);
				cb(err);
			}
			console.log('full entity: ', data)
			cb(null, data);
		})
	};
		
	
	CES.upsertEntity = function(ent, cb) {
		
		$.getJSON('/upsertEntity', ent, function(data, status) {
			console.log("getjson callback for upsert entity")
			if(status != 'success') {
				console.log("failed to upsert entity #"+ent.eid+" with status code " + status);
				cb(err);
			}
			
			cb(null, data);
		})
	};
		
	
	CES.upsertComponents = function(eid, components, cb) {
		
		var ent =  Object.assign({}, components, {eid: eid});
		$.getJSON('/upsertComponents', ent, function(data, status) {
			if(status != 'success') {
				console.log("failed to upsert entity #"+eid+" with status code " + status);
				cb(err);
			}
			
			cb(null, data);
		})
	};
	
	
	CES.listTypes = function(cb) {
		$.getJSON('/types', function(data, status) {
			if(status != 'success') {
				console.log("failed to fetch entity types with status code " + status);
				cb(status);
			}
			
			cb(null, data);
		})
	};
	CES.addType = function(name, dataType, cb) {
		$.getJSON('/addType', {name: name, dataType: dataType}, function(data, status) {
			if(status != 'success') {
				console.log("failed to add type with status code " + status);
				cb(status);
			}
			
			cb(null, data);
		})
	};
	
	// this is the main function to use
	CES.findEntitiesWithComps = function(compNames, cb) {
		$.getJSON('/findEntitiesWithComps', compNames, function(data, status) {
			if(status != 'success') {
				console.log("failed to fetch entities with comps with status code " + status);
				cb(status);
			}
			
			cb(null, data);
		})
	};
	
	CES.findFullEntitiesWithComps = function(compNames, cb) {
		$.getJSON('/findFullEntitiesWithComps', compNames, function(data, status) {
			if(status != 'success') {
				console.log("failed to fetch entities with comps with status code " + status);
				cb(status);
			}
			
			cb(null, data);
		})
	};
	
	
	
	
	
	
	
})();

















