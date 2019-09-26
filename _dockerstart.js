var pjson = require('./package.json');
require('dotenv').config();
var context = {
	package: pjson,
	functionName: pjson.name,
	functionVersion: pjson.version,
	memoryLimitInMB: 0,
	invokedFunctionArn: "",

	done: function(err, msg) { if(err){ console.log(msg); } process.exit(); },
	fail: function(err) { if(err){ console.log(err); } process.exit(); },
	succeed: function(msg) { if(msg){ console.log(msg); } process.exit(); },
	getRemainingTimeInMillis: function() { return 0; }
};

if(process.argv[2] !== undefined) {
	var event = "";
	var base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
	if(base64regex.test(process.argv[2])) {
		// If base64 encoded
		try{
			event = new Buffer(process.argv[2], 'base64').toString('ascii');
			event = JSON.parse(event) || {};
			require("./handler.js").indexData(event, context);
		} catch(e) {
			console.log("Error parsing event message (tried to decode base64).", e);
		}
	} else {
		// Not base64 encoded
		try{
			event = JSON.parse(process.argv[2]) || {};
			require("./handler.js").indexData(event, context);
		} catch(e) {
			console.log("Error parsing event message.", e);
		}
	}
} else {
	console.log("No event message passed.");
	process.exit();
}

process.on('uncaughtException', function (err) {
  console.log(err, err.stack);
  process.exit(1);
});