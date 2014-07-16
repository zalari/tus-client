#!/usr/bin/env node

/**
 * (c) Christian Ulbrich, Zalari UG (haftungsbeschränkt)
 * 2014
 */

var util = require('util'),
    path = require('path'),
    fs = require('fs');

var client = require('./lib/client.js');

var args = process.argv;

//console.log(util.inspect(args));
if (args.length < 4) {
    console.log("Usage: ",path.basename(args[1]),"file offset [end]");
    process.exit(1);
}

var filepath = args[2];
var offsetIndex = parseInt(args[3]);
var endIndex = parseInt(args[4]) || undefined;

if (endIndex==undefined){
    //when endIndex is not given, simply checksum the hole file,
    //i.e. the endIndex becomes the filesize
    var stats = fs.statSync(filepath);
    endIndex = stats.size;
}

console.log("FilePath:",filepath);
console.log("Offset:",offsetIndex);
console.log("Endset:",endIndex);

client.checksumFile(filepath,offsetIndex,endIndex)
    .then(function(checksum){
        console.log("Checksum",checksum);
    })
    .fail(function(err){
        console.log("Error",err)
    });


