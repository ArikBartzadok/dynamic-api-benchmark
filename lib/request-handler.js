'use strict';

var format = require('./format');
var settings = require('./settings');
var url = require('url');
var _ = require('underscore');
var DebugHelper = require('./debug-helper');

module.exports = {
  make: function(req, server, suite, suiteName, requestAgent, temporizador, requisicaoAtual, servico, rota, callback){
    requestAgent.make(req, server, temporizador, requisicaoAtual, servico, rota, function(err, response){

      temporizador.stop();
      // console.log('@@@ fim: request-handler: ', temporizador.time);
      
      var res = !!response ? {
        header: response.header,
        statusCode: response.statusCode,
        body: response.text,
        type: response.type
      } : false;

			// if (res) {
			// 	console.log('Status:', res.statusCode);
			// }
      // if (err) {
			// 	console.log(err);
			// }

      if(err && !res){
        // var code = err.code || 'Erro desconhecido';

        // return callback({
        //   code: code,
        //   message: err.message || code
        // }, res);
        // const debugHelper = new DebugHelper();
				// debugHelper.log(format(settings.errorMessages.GENERIC_ERROR, `${server}${suite.endpoint.route}`, `Código do erro: ${code}`));

				callback(null, {
					...res,
					statusCode: err.code
						? `Erro ${err.code}`
						: 'Status de erro desconhecido',
					body: JSON.stringify(err),
					header: null
				}, temporizador);
      }
      else if(!!suite.endpoint.expectedStatusCode && suite.endpoint.expectedStatusCode !== response.status) {
        return callback({
          code: settings.errorCodes.HTTP_STATUS_CODE_NOT_MATCHING,
          message: format(settings.errorMessages.HTTP_STATUS_CODE_NOT_MATCHING, suite.endpoint.expectedStatusCode, response.status, suiteName)
        }, res, temporizador);
			}
      else {
				callback(null, res, temporizador);
			}
    });
  },
  setup: function(suiteName, server, endpoint, suite, requestAgent, servico, rota){
    var self = this,
        req = null,
				finalURL = null,
        suiteOptions = {
          expectedStatusCode: suite.endpoint.expectedStatusCode,
          maxMean: suite.endpoint.maxMean,
          maxSingleMean: suite.endpoint.maxSingleMean,
          method: suite.endpoint.method
        },
        suiteRequest = {};

		if(!!suite.endpoint.route){
			suiteRequest.route = _.isFunction(suite.endpoint.route) ? 'Rotas dinâmicas' : suite.endpoint.route;

      // Este contexto, assim como seus antecessores, devem ser removidos, pois são inúteis...
			finalURL = url.resolve(server, _.isFunction(endpoint) ? endpoint() : endpoint);

			req = _.extend(_.clone(suite.endpoint), { url: finalURL });
			// console.log(req)
		}

    if(!!suite.endpoint.headers){
      suiteRequest.headers = _.isFunction(suite.endpoint.headers) ? 'Headers dinâmicos' : suite.endpoint.headers;
		}

    if(!!suite.endpoint.data){
      suiteRequest.data = _.isFunction(suite.endpoint.data) ? 'Dados dinâmicos' : suite.endpoint.data;
		}

    if(!!suite.endpoint.query){
      suiteRequest.query = _.isFunction(suite.endpoint.query) ? 'Query dinâmica' : suite.endpoint.query;
    }

    suite.runner.add(suiteName, finalURL, suiteOptions, suiteRequest, req, servico, rota, function(temporizador, requisicaoAtual, servico, rota, done){
      // console.log('@@@ req aqtual: ', requisicaoAtual);
      self.make(req, server, suite, suiteName, requestAgent, temporizador, requisicaoAtual, servico, rota, done);
    });
  }
};
