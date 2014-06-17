/**
 * Created by chris on 17.06.14.
 */

var client = require('../lib/client.js');

client.configure("http://127.0.0.1:8080/files/");
client.uploadFile('/Users/chris/Desktop/tmp/1G',"197da1a0-f605-11e3-84af-f9d292d80158");