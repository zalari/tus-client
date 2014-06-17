var http = require('http'),
    util = require('util');


//var request = require('request');

//hart-kodierter Aufruf
var uploadFilePath = "/Users/chris/Desktop/tmp/1G";

//request-Parameter zusammenbauen

var reqOptions = {
    hostname:"127.0.0.1",
    method:"HEAD",
    path:"/files/408b9e70-f608-11e3-a356-ad1df33a4acd",
    port:8080
};


req = http.request(reqOptions, function(res) {
 //Response verarbeiten
 console.log('STATUS: ' + res.statusCode);
 console.log('HEADERS: ' + util.inspect(res.headers));
});

//req ist fertig; also raus damit...
req.end();

/*
var http = require('http');
var options = {method: 'HEAD', host: '127.0.0.1', port: 8080, path: '/files/408b9e70-f608-11e3-a356-ad1df33a4acd'};
var req = http.request(options, function(res) {
        console.log(res.statusCode);
        console.log(JSON.stringify(res.headers));
    }
);
*/
//req.end();