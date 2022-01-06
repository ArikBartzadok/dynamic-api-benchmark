'use strict';

var url = require('url');
var _ = require('underscore');

module.exports = function(agent){
  this.agent = agent;

  var evalIfFunction = function(variable, options){
    return _.isFunction(variable) ? variable(options) : variable;
  };

  // recebe o indice da requisição aqui e lê da memoria
  this.make = function(options, server, temporizador, callback){
		const criarURLFinal = (endpoint) => {
			return url.resolve(server, endpoint);
		};

    var data = evalIfFunction(options.data, options) || {},
        query = evalIfFunction(options.query, options) || {},
        headers = evalIfFunction(options.headers, options) || {},
        method = options.method === 'delete' ? 'del' : options.method,
        request = this.agent[method](
					criarURLFinal(
						evalIfFunction(options.route, options)
					)
				);

    if(!_.isEmpty(data)) {
      request.send(data);
		}

    if(!_.isEmpty(query)) {
      request.query(query);
    }

    _.forEach(headers, function(header, headerName){
      request.set(headerName, header);
    });

    // console.log('\n@@@ inicio: request-agent: ', temporizador.time);
    temporizador.start();

    request.end(callback);
  };
};
