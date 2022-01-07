'use strict';

var url = require('url');
var _ = require('underscore');

var fs = require('fs');

module.exports = function(agent){
  this.agent = agent;

  this.dadosBody = null;
  this.dadosQuery = null;
  this.dadosRota = null;
  this.dadosHeaders = null;

  var self = this;

  var evalIfFunction = function(variable, options){
    return _.isFunction(variable) ? variable(options) : variable;
  };

  // recebe o indice da requisição aqui e lê da memoria
  this.make = function(options, server, temporizador, requisicaoAtual, servico, rota, callback){
		const criarURLFinal = (endpoint) => {
			return url.resolve(server, endpoint);
		};

    // console.log('@@@ atual', requisicaoAtual)
    if (!self.dadosBody) {
      self.dadosBody = fs.readFileSync(`tmp/memoria_body_${servico}_${rota}.json`, { encoding: 'utf8' });
      self.dadosBody = JSON.parse(self.dadosBody);
    }
    if (!self.dadosQuery) {
      self.dadosQuery = fs.readFileSync(`tmp/memoria_query_${servico}_${rota}.json`, { encoding: 'utf8' });
      self.dadosQuery = JSON.parse(self.dadosQuery);
    }
    if (!self.dadosRota) {
      self.dadosRota = fs.readFileSync(`tmp/memoria_rota_${servico}_${rota}.json`, { encoding: 'utf8' });
      self.dadosRota = JSON.parse(self.dadosRota);
    }
    
    var data = self.dadosBody[requisicaoAtual],
        query = self.dadosQuery[requisicaoAtual],
        headers = evalIfFunction(options.headers, options) || {},
        method = options.method === 'delete' ? 'del' : options.method,
        request = this.agent[method](criarURLFinal(self.dadosRota[requisicaoAtual]));

        // console.log(self.dadosBody[requisicaoAtual])
        // console.log(self.dadosQuery[requisicaoAtual])
        // console.log(self.dadosRota[requisicaoAtual])

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
