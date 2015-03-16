var Utilities = function(container, config, dispatcher) {
	this.container = container;
	this.config = config;
	this.dispatcher = dispatcher;
};
Utilities.prototype = {
	container: null,
	config: null,
	dispatcher: null,
	
	onKernelReady: function(next) {
		var config = this.config.get('utilities') || {};
		if(config.httpAuth !== undefined) {
			this.lanchHttpAuth(config.httpAuth);
		}
		if(config.virtualLatency !== undefined) {
			this.lanchVirtualLatency(config.virtualLatency);
		}
		next();
	},
	
	lanchHttpAuth: function(config) {
		if(config.enabled !== true && config.enabled !== 'true') {
			return;
		}
		config.title = config.title || 'Security';
		config.password = config.password || {};
		config.ip = config.ip || {};
		var self = this;
		var respond = function(response, status, title) {
			response.setContentType('text/html');
			response.statusCode = status;
			response.content =   '<!doctype html>'
								+'<html>'
								+'<head>'
								+'	<title>['+status+'] '+title+'</title>'
								+'</head>'
								+'<body>'
								+'	<h1>['+status+'] '+title+'</h1>'
								+'</body>'
								+'</html>';
			response.hasResponse = true;
		};
		this.dispatcher.set('http.server.request', function(next, request, response) {
			var ip = config.ip[request.getClientIp()];
			if(ip === true) {
				next();
				return;
			} else if(ip === false) {
				respond(response, 403, 'Permission denied');
				next();
				return;
			}
			var authorization = request.getHeader('authorization');
			if(authorization !== undefined) {
				authorization = authorization.match(/^Basic (.*)$/);
				if(authorization !== null && self.container.get('validator').isBase64(authorization[1]) === true) {
					authorization = new Buffer(authorization[1], 'base64').toString('ascii');
					authorization = authorization.split(':');
					if(authorization.length === 2 && config.password[authorization[0]] !== undefined && config.password[authorization[0]] === authorization[1]) {
						next();
						return;
					}
				}
			}
			response.setHeader('WWW-Authenticate', 'Basic realm="'+config.title.replace(/"/g, '\\"')+'"');
			respond(response, 401, 'Authorization Required');
			next();
		});
	},
	
	lanchVirtualLatency: function(config) {
		if(config.enabled !== true && config.enabled !== 'true') {
			return;
		}
		config.latency = config.latency || 0;
		this.dispatcher.set('http.server.response', function(next, request, response) {
			var latency = config.latency;
			if(latency instanceof Array) {
				latency = Math.floor((Math.random()*latency[1])+latency[0]);
			}
			setTimeout(function() {
				next();
			}, latency);
		});
	},
};


module.exports = Utilities;
