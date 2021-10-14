'use strict';

var format = require('./format');
var settings = require('./settings');
var url = require('url');
var _ = require('underscore');

module.exports = {
  make: function(req, server, suite, suiteName, requestAgent, callback){
    requestAgent.make(req, server, function(err, response){

      var res = !!response ? {
        header: response.header,
        statusCode: response.statusCode,
        body: response.text,
        type: response.type
      } : false;

			if (res) {
				console.log('Status:', res.statusCode)
			}

      if(err && !res){
        var code = err.code || 'Unknown';

        return callback({
          code: code,
          message: err.message || code
        }, res);
      }
      else if(!!suite.endpoint.expectedStatusCode && suite.endpoint.expectedStatusCode !== response.status) {
        return callback({
          code: settings.errorCodes.HTTP_STATUS_CODE_NOT_MATCHING,
          message: format(settings.errorMessages.HTTP_STATUS_CODE_NOT_MATCHING, suite.endpoint.expectedStatusCode, response.status, suiteName)
        }, res);
			}
      else {
				callback(null, res);
			}
    });
  },
  setup: function(suiteName, server, endpoint, suite, requestAgent){
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
			suiteRequest.route = _.isFunction(suite.endpoint.route) ? 'Dynamic routes' : suite.endpoint.route;

      // Este contexto, assim como seus antecessores, devem ser removidos, pois são inúteis...
			finalURL = url.resolve(server, _.isFunction(endpoint) ? endpoint() : endpoint);

			req = _.extend(_.clone(suite.endpoint), { url: finalURL });
			// console.log(req)
		}

    if(!!suite.endpoint.headers){
      suiteRequest.headers = _.isFunction(suite.endpoint.headers) ? 'Dynamic headers' : suite.endpoint.headers;
		}

    if(!!suite.endpoint.data){
      suiteRequest.data = _.isFunction(suite.endpoint.data) ? 'Dynamic data' : suite.endpoint.data;
		}

    if(!!suite.endpoint.query){
      suiteRequest.query = _.isFunction(suite.endpoint.query) ? 'Dynamic query' : suite.endpoint.query;
    }

    suite.runner.add(suiteName, finalURL, suiteOptions, suiteRequest, function(done){
      self.make(req, server, suite, suiteName, requestAgent, done);
    });
  }
};
