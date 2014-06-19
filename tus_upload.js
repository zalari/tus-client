#!/usr/bin/env node
var util = require('util'),
    path = require('path');

var client = require('./lib/client.js');

var args = process.argv;

//console.log(util.inspect(args));
if (args.length < 4) {
    console.log("Usage: ",path.basename(args[1]),"file uploadURI [offset]");
    process.exit(1);
}

var uploadFilePath = args[2];
var uploadURI = args[3];
var offsetIndex = args[4] || 0;
//remote Dateinamen extrahieren aus eigentlichem Dateinamen
var remoteFilename = path.basename(uploadFilePath);

console.log("UploadFilePath:",uploadFilePath);
console.log("Upload-URI:",uploadURI);
console.log("Offset:",offsetIndex,"wird z.Zt. ignoriert...");
console.log("remoteFilename",remoteFilename);

client.configure(uploadURI);
client.uploadFile(uploadFilePath,remoteFilename).then(function(){
    console.log("Upload succeded...");
}).fail(function(){
    console.log("Upload failed...");
});

