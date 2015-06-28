var http = require('http')
var fs = require('fs')
var rangeParser = require('range-parser')
var url = require('url')
var mime = require('mime')
var pump = require('pump')


module.exports = function (path) {
	var stats = fs.statSync(path);
  var server = http.createServer()
  var getType = mime.lookup.bind(mime)

  server.on('request', function (request, response) {
    var u = url.parse(request.url)
    var host = request.headers.host || 'localhost'


    // Allow CORS requests to specify arbitrary headers, e.g. 'Range',
    // by responding to the OPTIONS preflight request with the specified
    // origin and requested headers.
    if (request.method === 'OPTIONS' && request.headers['access-control-request-headers']) {
      response.setHeader('Access-Control-Allow-Origin', request.headers.origin)
      response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
      response.setHeader(
          'Access-Control-Allow-Headers',
          request.headers['access-control-request-headers'])
      response.setHeader('Access-Control-Max-Age', '1728000')

      response.end()
      return
    }

    if (request.headers.origin) response.setHeader('Access-Control-Allow-Origin', request.headers.origin)

    if (u.pathname === '/favicon.ico') {
      response.statusCode = 404
      response.end()
      return
    }

    var range = request.headers.range
    range = range && rangeParser(stats.size, range)[0]
    response.setHeader('Accept-Ranges', 'bytes')
    response.setHeader('Content-Type', mime.lookup(path))
    response.setHeader('transferMode.dlna.org', 'Streaming')
    response.setHeader('contentFeatures.dlna.org', 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=017000 00000000000000000000000000')
    if (!range) {
      response.setHeader('Content-Length', stats.size);
      if (request.method === 'HEAD') return response.end()
      pump(fs.createReadStream(path), response)
      return
    }

    response.statusCode = 206
    response.setHeader('Content-Length', range.end - range.start + 1)
    response.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + stats.length)
    response.setHeader('transferMode.dlna.org', 'Streaming')
    response.setHeader('contentFeatures.dlna.org', 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=017000 00000000000000000000000000')
    if (request.method === 'HEAD') return response.end()
    pump(fs.createReadStream(path, {start: range.start, end: range.end}), response)
  })

  server.on('connection', function (socket) {
    socket.setTimeout(36000000)
  })

  return server
}