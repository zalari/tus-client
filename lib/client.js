/**
 * Created by chris on 17.06.14.
 */

var url = require('url'),
    fs = require('fs'),
    events = require('events'),
    http = require('http'),
    util = require('util');

var _ = require('lodash'),
    Q = require('q');

var self = {};


//Helper-Funktionen

var _getFileSize = function(filepath) {
    //TODO: Fehlerverarbeitung machen...
    var stats = fs.statSync(filepath);
    return stats.size;
};

var _getOffset = function(filename) {
    var deferred = Q.defer();
    //beim Server anfragen, wieviele Bytes der Server für eine Datei schon hat

    //-> tus.io 5.1 HEAD-Req ausführen...
    var reqOpts = {};
    reqOpts = _.clone(self.options.reqOpts);
    reqOpts.method="HEAD";
    reqOpts.path=url.resolve(reqOpts.path,filename);
    reqOpts.headers={};
    delete reqOpts['pathname'];
    console.log("reqOpts:",reqOpts);
    var req = http.request(reqOpts);
    req.on('error',function(err){
        console.log('Error!');
        deferred.reject(err);
    });
    req.once('response',function(response) {

        /*if (error) {
            //TODO: sinnvollen Fehler werfen...
            deferred.reject(error);
        }
        else {*/

        //die Fehlerverarbeitung erfolgt bei http.requests event-basiert,
        //demzufolge muss das ganze Ding auch Event-basiert sein...

            //die Anfrage wurde verarbeitet; jetzt auf die Status-Codes reagieren
            //wir erwarten vom Server, dass _getOffset immer befriedigt werden kann,
            //da alle Dateien hochgeladen werden können und vom Client gesetzt werden können

            //aber erstmal den Req loggen
            console.log("Status:",response.statusCode);
            console.log("Headers:",response.headers);
            //Offset extrahieren
            var offset = response.headers['offset'];
            deferred.resolve(offset)
        }
    );
    return deferred.promise;
};

//Default-Optionen;
self.options = {
    url : "http://127.0.0.1:8080",
    reqOpts : {
        method:"PATCH",
        headers:{
            "content-type": "application/offset+octet-stream",
            "Offset":0,
            "content-length":0
        }
    }
};


self.configure = function (options) {
    //either pass in an URL (i.e. string) or an Object
    if (typeof options == "string") {
        self.options.url=options;
    } else if (typeof options == "object") {
        self.options = _.merge(self.options,options);
    } else {
        return new Error("Invalid options!");
    }
    //URL-String -> parse it and merge it into the actual reqOpts
    var tempOpts = url.parse(self.options.url);
    self.options.reqOpts = _.merge(self.options.reqOpts,tempOpts);
    console.log(util.inspect(self.options));

    //set up event emitter...

};

var _simpleUpload = function(filepath, remoteFilename) {
    //eine Datei hochladen

    //dazu erst einmal die Größe der Datei lokal feststellen
    var finalLength = _getFileSize(filepath);
    console.log("finalLength:",finalLength);

    //herausfinden, ob der Server diese Datei schon hat...
    //-> offSet bestimmen
    _getOffset(remoteFilename).then(function(offset){
        console.log("offset:",offset);
    });

    //wenn der offSet = der finalen Länge, dann hat der Server die Datei (bzw. eine gleich große)

    //wenn nicht, den Upload resumen mit dem Offset; zur Not vom Offset 0 aus...

};

self.uploadFile = function(filename, remoteFilename) {
    _simpleUpload(filename, remoteFilename);
};

self.start = function() {
    //startet den Upload

};




module.exports = self;
