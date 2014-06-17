var http = require('http'),
    util = require('util');


//var request = require('request');

//hart-kodierter Aufruf
var uploadFilePath = "/Users/chris/Desktop/tmp/1G";

//request-Parameter zusammenbauen

var reqOptions = {
    hostname:"127.0.0.1",
    method:"HEAD",
    path:"/files/7e293750-f64a-11e3-9349-3b31a9606388",
    port:8080
};


req = http.request(reqOptions, function(res) {
 //Response verarbeiten
 console.log('STATUS: ' + res.statusCode);
 console.log('HEADERS: ' + util.inspect(res.headers));
});

//req ist fertig; also raus damit...
req.end();
