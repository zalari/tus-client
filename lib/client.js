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
    //dazu Base-Opts klonen
    reqOpts = _.clone(self.options.reqOpts);
    reqOpts.method="HEAD";
    reqOpts.path=url.resolve(reqOpts.path,filename);
    delete reqOpts['pathname'];
    //console.log("reqOpts:",reqOpts);
    var req = http.request(reqOpts);
    //HEAD-Request auslösen...
    req.end();
    req.on('error',function(err){
        console.log('Error!');
        deferred.reject(err);
    });
    req.once('response',function(response) {

        //die Fehlerverarbeitung erfolgt bei http.requests event-basiert,
        //demzufolge muss das ganze Ding auch Event-basiert sein...

            //die Anfrage wurde verarbeitet; jetzt auf die Status-Codes reagieren
            //wir erwarten vom Server, dass _getOffset immer befriedigt werden kann,
            //da alle Dateien hochgeladen werden können und vom Client gesetzt werden können

            //aber erstmal den Req loggen
            //console.log("Status:",response.statusCode);
            if (response.statusCode==200) {
                var offset = response.headers['offset'];
                deferred.resolve(offset);
            } else {
                console.log("Error-Code:"+response.statusCode);
                deferred.reject(response.statusCode);
            }
        }
    );
    return deferred.promise;
};

//Default-Optionen;
self.options = {
    url : "http://127.0.0.1:8080",
    retries : 5,
    timeOut : 30,
    reqOpts : {}
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

var _resumeUpload= function(filepath, remoteFilename, offset,totalFileLength, retriesLeft,done) {
    //Versuche eine Datei die in filepath liegt an die self.reqOpts hochzuladen unter
    //dem dortigen Dateinamen remoteFilename beginnend ab offset; wenn retriesLeft gleich 0,
    //dann lass es oder aber du bist fertig, du Fuchs du
    if (!done || retriesLeft!=0) {
        var reqOpts = _.clone(self.options.reqOpts);
        reqOpts.method="PATCH";
        reqOpts.headers={
            "content-type": "application/offset+octet-stream",
            "offset":parseInt(offset),
            "content-length":totalFileLength-offset
        };
        reqOpts.path=url.resolve(reqOpts.path,remoteFilename);
        delete reqOpts['pathname'];
        console.log(reqOpts);
        //Datei mittels ReadStream an Req binden, den ReadStream auf Offset setzen...
        var req = http.request(reqOpts);
        //Event-Handler registrieren...
        req.on('error',function(){
            console.log("req-err");
           //TODO:Fehler-Behandlung...
            //Das sind Vermutlich Fehler, wie kein Netz etc...
            //TODO:exponental back-off... einbauen
            console.log("retry!");
            setTimeout(function(){
                //neuen Offset bestimmen und danach noch einmal hochladen...
                _getOffset(remoteFilename).then(function(newOffset){
                    _resumeUpload(filepath,remoteFilename,newOffset,totalFileLength,retriesLeft--,false);
                });
            },self.options.timeOut*1000);
        });
        req.once('response',function(res){
            //es gab eine Antwort, also müsste der Server eigentlich fertig sein...
            if (res.statusCode==200) {
                //Upload erfolgreich...
                console.log('Upload erfolgreich...');
                return true;
            } else {
                //Upload erneut versuchen... -> Internal Server-Error?
                //TODO:exponental back-off... einbauen
                setTimeout(function(){
                    //neuen Offset bestimmen und danach noch einmal hochladen...
                    console.log("retry!");
                    _getOffset(remoteFilename).then(function(newOffset){
                        _resumeUpload(filepath,remoteFilename,newOffset,totalFileLength,retriesLeft--,false);
                    });
                },self.options.timeOut*1000);
            }
        });
        //jetzt eigentlich Req ausführen, indem der ReadStream an den Req gepiped wird
        var rs = fs.createReadStream(filepath,{start:parseInt(offset),end:totalFileLength});
        rs.pipe(req);
    } else {
        //wenn es fertig ist, dann Juchhe!
        if (done) {
            console.log('Upload erfolgreich...');
            return true;
            //TODO: event-promise-irgendwas
        } else {
            //ansonsten ist es halt blöd
            console.log('Upload fehlgeschlagen');
            return false;
        }
    }

    var retries = self.options.retries;


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
        //wenn der offSet = der finalen Länge, dann hat der Server die Datei (bzw. eine gleich große)
        if (offset==finalLength) {
            console.log('Datei ist bereits hochgeladen...')
            //TODO: success-event auslösen...
        } else {
            //es muss noch etwas hochgeladen werden...
            console.log('Lade Datei hoch...');
            _resumeUpload(filepath, remoteFilename, offset,finalLength,self.options.retries,false);
        }



        //wenn nicht, den Upload resumen mit dem Offset; zur Not vom Offset 0 aus...


    });


};

self.uploadFile = function(filename, remoteFilename) {
    _simpleUpload(filename, remoteFilename);
};

self.start = function() {
    //startet den Upload

};




module.exports = self;
