/**
 * Created by chris on 17.06.14.
 */

var client = require('../lib/client.js');

client.configure("http://intern.zalari.de:5000/files/");
client.uploadFile('/Users/chris/Desktop/tmp/200M',"438bd490-f654-11e3-a9d8-cd23b5b3c4c3");