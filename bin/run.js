#!/usr/bin/env node

var server = require('../lib/');
var opts = require('rc')('ramserv',{
	port: 8888,
});


var path = opts._[0];

var s = server(path);

s.listen(opts.port || 0, opts.hostname)
