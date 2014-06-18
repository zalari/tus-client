var path = require('path'),
    util = require('util'),
    fs = require('fs');
    http = require('http');


//var request = require('request');

//hart-kodierter Aufruf
var uploadFilePath = "/Users/chris/Desktop/tmp/1G";
//var uploadURI = args[3];
var offsetIndex = 368;

//wir wissen ab welcher Position gesendet werden soll, müssen aber noch in Erfahrung bringen, wieviel noch gesendet wird

//dazu Dateigröße besorgen
var stats = fs.statSync(uploadFilePath);
var finalLength = stats.size;
var contentLength = finalLength - offsetIndex;

//LeseStream besorgen und an den passenden Offset bringen und diesen dann an Request pipen


//request-Parameter zusammenbauen

var reqOptions = {
    hostname:"127.0.0.1",
    method:"PATCH",
    path:"/files/7e293750-f64a-11e3-9349-3b31a9606388",
    port:8080,
    headers:{
        "content-type": "application/offset+octet-stream",
        "Offset":parseInt(offsetIndex),
        "content-length":contentLength
    }
};


//rs.pipe(req);

console.log(reqOptions);
ws = fs.createWriteStream('./out');
rs = fs.createReadStream(uploadFilePath,{start:parseInt(offsetIndex),end:finalLength});

//rs.pipe(ws);

//req ausführen

req = http.request(reqOptions);
req.once('response', function(res) {
 //Response verarbeiten
 console.log('STATUS: ' + res.statusCode);
 console.log('HEADERS: ' + util.inspect(res.headers));
 });


rs.pipe(req);
//request starten...
/*
var reqStream = request(reqOptions,function(err,response,body){
        //CB für alles...
        if (err){
            console.log("Fehler",err);
        }
        else {
            console.log("Request finished...");
            //console.log(util.inspect(response));
            console.log("Status-Code:",response.statusCode);
            //console.log("Body:",util.inspect(response));
        }
    });
*/




    /*.pipe(ws);*/
