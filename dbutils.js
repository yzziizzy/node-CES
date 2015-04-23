

 
 

function trans(db, workFn, finalCB) {
	function commit(data) {
		db.query('COMMIT', function(err, res) {
			if(err) {
				db.query('ROLLBACK', function(err2, res2) {
					if(err2) return finalCB([err, err2]);
					finalCB(err, res2);
				});
			}
			finalCB(null, data);
		});
	};
	
	function rollback(data) {
		db.query('ROLLBACK', function(err, res) {
			if(err) return finalCB(err);
			finalCB('rollback', data);
		});
	};
	
	
	db.query('BEGIN', function(err, res) {
		if(err) finalCB(err);
		
		workFN(db, rollback, commit);
	});
};


function transList(db, queries, finalCB) {
	function work(trandb, rollback, commit) {
		var i = 0;
		var acc = [];
		
		function nibble() {
			var q = queries[i++];
			var p = {};
			if(!q) return commit(acc); // TODO test this part to see if it works
			
			
			if(typeof q == 'object') {
				p = q.p;
				q = q.q;
			}
			
			trandb.query(q, p, function(err, res) {
				if(err) {
					return rollback([err, acc]);
				}
				
				acc.push(res);
				
				process.nextTick(nibble);
			});
			
		}
		
		nibble();
		
	}
	
	trans(db, work, finalCB);
	
};




module.exports = {
	trans: trans,
	transList: transList,
};
