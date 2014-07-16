# tus-server
[TUS Protocol 0.2.2](http://www.tus.io/protocols/resumable-upload.html) Client implementation in nodejs.

Right now it is a heavy work in progress and it does not claim to be compatible to the tus.io protocol (yet). But stay tuned!

## Configuration
edit config.json
```js
{
	"port":5000,
    "prefixPath":"/upload/", //prefix for URL, where the service is waiting
    "fileUploadPath":"files", //path to dir, where files are stored
    "serverString":"tus-server", //Server-Agent :)
    "logDir": "logs", //Winston-Options...
    "logRotateSize": 10485760,
    "logLevel": "info",
    "host":"127.0.0.1" //Address, that the server should bind to
}
```
- Allowed [log levels](https://github.com/flatiron/winston#using-logging-levels): debug, info, warn, error
- LogRotateSize: 10MB default

## Install
```
npm install
```

## Examples

tus-client comes with a command-line based client tool:
```
tus_upload.js file uploadURI [offset]
```
The uploadURI *must* end with a slash!

## Usage
Have a look at (tus_upload.js) to see how to use the module.

## License
[MIT License](LICENSE.md).
