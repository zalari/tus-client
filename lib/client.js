/**
 * (c) Christian Ulbrich, Zalari UG (haftungsbeschränkt)
 * 2014
 */
var url = require('url'),
    fs = require('fs'),
    http = require('http'),
    util = require('util'),
    crypto = require('crypto');

var _ = require('lodash'),
    Q = require('q'),
    backoff = require('backoff');

var self = {};


//help functions
var _getFileSize = function(filepath) {
    //TODO: Fehlerverarbeitung machen...
    var stats = fs.statSync(filepath);
    return stats.size;
};

var _getOffset = function(filename) {
    var deferred = Q.defer();
    //what is the current offset of the file?

    //-> tus.io 5.1 HEAD-Req ausführen...
    var reqOpts = {};
    //clone base-opts for sane defaults
    reqOpts = _.clone(self.options.reqOpts);
    reqOpts.method="HEAD";
    reqOpts.path=url.resolve(reqOpts.path,filename);
    delete reqOpts['pathname'];
    //console.log("reqOpts:",reqOpts);
    var req = http.request(reqOpts);
    //issue HEAD-Request
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
                var offset = parseInt(response.headers['offset']);
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
    initialBackOffDelay : 5000,
    maxBackOffDelay : 100000,
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
    //console.log(util.inspect(self.options));

    //set up event emitter...

};

/**
 * Kapselt einen tus-Upload-Request...
 * @param filepath
 * @param remoteFilename
 * @param offset
 * @returns {promise|*|Q.promise}
 * @private
 */
var _uploadRequest = function(filepath, remoteFilename, offset) {
    var deferred = Q.defer();
    //TODO:auch hier kann es natürlich einen Fehler geben...
    var totalFileLength = _getFileSize(filepath);

    //FEATURE:checksums
    var checksum = crypto.createHash('sha1');
    var transmittedBytes = 0;
    /*
      checksums werden immer über einen range gebildet
     */

    //Request
    //=======
    var reqOpts = _.clone(self.options.reqOpts);
    reqOpts.method="PATCH";
    reqOpts.headers={
        "content-type": "application/offset+octet-stream",
        "offset":offset,
        "content-length":totalFileLength-offset
    };
    reqOpts.path=url.resolve(reqOpts.path,remoteFilename);
    //TODO: test whether deleting the pathname option is really necessary...
    delete reqOpts['pathname'];
    console.log(reqOpts);
    var req = http.request(reqOpts);
    //event-handler registration
    req.on('error',function(err){
        deferred.reject(err);
    });
    req.once('response',function(res){
        //we got an answer, thus the server should be ready...
        if (res.statusCode==200) {
            //Upload erfolgreich...
            var d = checksum.digest('hex');
            console.log("Checksum for bytes in range %d - %d should be %s:",offset,transmittedBytes,d);
            deferred.resolve(true);
        } else {
            //there has been an answer that is not 200 -> Internal Server-Error?
            deferred.reject(res.statusCode);
        }
    });
    //don't forget to actually send data :)
    //TODO: client-seitige IO-Fehler noch abfangen...
    var rs = fs.createReadStream(filepath,{start:offset,end:totalFileLength});
    rs.on('data',function(dataChunk){
      checksum.update(dataChunk);
        transmittedBytes+=dataChunk.length;
    });
    //now we are done...
    /*rs.on('end',function(){

    });*/
    rs.pipe(req);
    return deferred.promise;
};


/**
 * calculates the checksum for a range of bytes in a file
 * @param filepath full qualified path to file that is about to be hashed
 * @param start int offsetBegin for checksum calculation
 * @param end int offsetEnd for checksum calculation
 * @param hashCipher desired hashCipher, e.g. 'sha1'
 * @returns Promise that resolves to the hashString
 * @private
 */
var _checksumForRangeInFile = function(filepath, start, end, hashCipher) {
    hashCipher = hashCipher || 'sha1';
    var deferred = Q.defer();
    var checksum = crypto.createHash(hashCipher);
    var rs = fs.createReadStream(filepath,{"start":start,"end":end});
    rs.on('data',function(chunk){
       checksum.update(chunk);
    });
    rs.on('end',function(){
        var d = checksum.digest('hex');
        deferred.resolve(d);
    });
    rs.on('error',function(err){
       deferred.reject(err);
    });

    return deferred.promise;
};

var _uploadAction = function(filepath, remoteFilename) {
    var deferred = Q.defer();
    //ein Einzelner Upload beseht immer darin, dass ein Offset ermittelt wird und dann
    //mit diesem ein Upload initiert wird
    _getOffset(remoteFilename)
    .then(function(offset) {
        //Offset ist jetzt vorhanden, also PATCH-Request machen...
        return _uploadRequest(filepath,remoteFilename,offset);
    })
    .then(function(){
        //jetzt scheint der Upload funktioniert zu haben; also resolven
        deferred.resolve(true);
    })
    .fail(function(err){
        deferred.reject(err);
    });
    return deferred.promise;
};

var _resumeUpload= function(filepath, remoteFilename) {
    var deferred = Q.defer();

    //Datei mittels uploadAction hochladen; wenn die uploadAction failt, dann backoff nutzen

    //dazu verwenden wir node-backoff... und dafür brauchen wir eine spezielle Wrapper-Fn
    var _fnWrapper = function(options,callback) {
        console.log("Upload-Action...");
        _uploadAction(options.filepath,options.remoteFilename)
            .then(function(){
                //Upload hat funktioniert, also backoff mittels cb darüber informieren
                callback(null,true);
            })
            .fail(function(err){
                //Upload hat nicht funktionier, also backoff darüber informieren
               callback(err,null);
            });
    };

    //Wrapper an Backoff delegieren...
    var call = backoff.call(_fnWrapper, {"filepath":filepath,"remoteFilename":remoteFilename}, function(err, res) {
        // Notice how the call is captured inside the closure.
        console.log('Retries: ' + call.getResults().length);
        if (err) {
            console.log('Error: ' + err);
            deferred.reject(err);
        } else {
            console.log("Upload ist fertsch.");
            console.log('Ergebnis: ' + res);
            deferred.resolve(res);
        }
    });
    call.on('backoff', function(number, delay) {
        //der Fehler kann ja auch mittendrin passiert sein; deshalb
        //muss jetzt natürlich erneut das aktuelle Offset festgestellt werden und
        //dann neu resumed werden...
        console.log('backoff: ' + util.inspect(arguments));
    });
    //Parameter an Backoff übergeben und eigentlichen Call initiieren...
    call.setStrategy(new backoff.ExponentialStrategy({initialDelay:self.options.initialBackOffDelay,maxDelay:self.options.maxBackOffDelay}));
    call.failAfter(self.options.retries);
    call.start();

    return deferred.promise;

};

var _simpleUpload = function(filepath, remoteFilename) {
    //eine Datei hochladen...
    var deferred = Q.defer();

    //dazu erst einmal die Größe der Datei lokal feststellen
    var finalLength = _getFileSize(filepath);
    //console.log("finalLength:",finalLength);
    //herausfinden, ob der Server diese Datei schon hat...
    //-> offSet bestimmen
    _getOffset(remoteFilename).then(function(offset){
        console.log("offset:",offset);
        //wenn der offSet = der finalen Länge, dann hat der Server die Datei (bzw. eine gleich große)
        if (offset==finalLength) {
            console.log('File has already been uploaded...')
            //TODO: success-event auslösen...
            deferred.resolve(true);
        } else {
            //es muss noch etwas hochgeladen werden...
            console.log('Uploading file...');
            return _resumeUpload(filepath, remoteFilename, offset,finalLength,self.options.retries,false);
        }

    });
    return deferred.promise;
};

self.uploadFile = function(filename, remoteFilename) {
    return _resumeUpload(filename, remoteFilename);
};

self.checksumFile = _checksumForRangeInFile;


module.exports = self;
