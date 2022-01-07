'use strict';

var benchmarkUtils = require('./benchmark-utils');
var EventsHandler = require('events').EventEmitter;
var format = require('./format');
var giveMe = require('give-me');
var settings = require('./settings');
var Timer = require('./timer.js');
var _ = require('underscore');

var fs = require('fs');

module.exports = function(options){

  this.steps = [];
  this.results = [];
  this.options = options;

  var evalIfFunction = function(variable){
    return _.isFunction(variable) ? variable() : variable;
  };

  this.add = function(stepName, href, stepOptions, stepRequest, opcoes, servico, rota, func){

    var self = this,
        callbackDone = false,
        isSequence = !self.options.runMode || (self.options.runMode === 'sequence'),
        maxConcurrent = isSequence ? 1 : self.options.maxConcurrentRequests,
        totalRequests = self.options.minSamples,
        cycleLength = (maxConcurrent && (totalRequests > maxConcurrent)) ? maxConcurrent : totalRequests,
        cycleDelay = isSequence ? self.options.delay : 0,
        globalTimer = new Timer(),
        sampled = 0,
        i = 0;

    var step = {
      name: stepName,
      func: func,
      href: href,
      stats: {
        sample: []
      },
      errors: {},
      options: _.extend(stepOptions, {
        concurrencyLevel: maxConcurrent
      }),
      request: stepRequest
    };

    step.run = function(callback){

      var runNextSample;

      var sampleDone = function(sample, pos, err){
        if(!callbackDone){

          var currentGlobalTime = self.getCurrentTime(globalTimer, isSequence),
              maxTime = self.options.maxTime;

          step.stats.sample[pos] = sample;
          sampled++;

          if(err){
            if(!step.errors[err.code]){
              step.errors[err.code] = [];
						}

            step.errors[err.code].push(_.extend(err, { pos: pos }));
          }

          if(totalRequests > i && (currentGlobalTime < maxTime)){
            if(cycleDelay > 0) {
              setTimeout(runNextSample, cycleDelay);
						}
            else {
              runNextSample();
						}
          } else if(sampled === totalRequests || currentGlobalTime >= maxTime) {
            step.options.end = new Date();
            callbackDone = true;
            callback(self.addResult(step));
          }
        }
      };

      runNextSample = function(){
        if(isSequence) {
          globalTimer.start();
        }
        // cada uma das requisições são rodadas aqui
        self.runSample(step, sampleDone, i, servico, rota);
        i++;
      };

      // para o rotal de requisições (totalRequests), gera os arquivos .json
      var dadosRota = [], dadosHeaders = [], dadosBody = [], dadosQuery = [];
      for (let quantidadeJson = 0; (quantidadeJson < totalRequests); quantidadeJson++) {
        if (!quantidadeJson) console.log('@@@ gerando dados para o json');

        var _body = evalIfFunction(opcoes.data) || {},
          _query = evalIfFunction(opcoes.query) || {},
          _rota = evalIfFunction(opcoes.route) || {},
          _headers = evalIfFunction(opcoes.headers) || {};

        dadosBody.push(_body);
        dadosQuery.push(_query);
        dadosRota.push(_rota);
        dadosHeaders.push(_headers);
      }

      fs.writeFileSync(`tmp/memoria_body_${servico}_${rota}.json`, JSON.stringify(dadosBody), { encoding: 'utf8' });
      fs.writeFileSync(`tmp/memoria_query_${servico}_${rota}.json`, JSON.stringify(dadosQuery), { encoding: 'utf8' });
      fs.writeFileSync(`tmp/memoria_rota_${servico}_${rota}.json`, JSON.stringify(dadosRota), { encoding: 'utf8' });
      fs.writeFileSync(`tmp/memoria_headers_${servico}_${rota}.json`, JSON.stringify(dadosHeaders), { encoding: 'utf8' });

      globalTimer.start();
      step.options.start = new Date();

      for(i = 0; i < cycleLength; i++) {
        // para cada pacote (cycle) executa uma vez
        (self.runSample)(step, sampleDone, i, servico, rota);
			}
    };
    this.steps.push(step);
  };

  this.runSample = function(step, next, i, servico, rota){
    var self = this,
        timer = new Timer();

    // timer.start();
    
    // passar o index aqui, para a func()
    step.func(timer, i, servico, rota, function(err, response, temporizador){
      
      // timer.stop();

      if(err) {
        self.emit('error', _.extend(_.clone(err), {
          details: step.href + ' (' + i + ')'
        }));
			}

      if(!step.response) {
        step.response = response;
			}

      // console.log('@@@ fim: runner:', temporizador.time);

      next(temporizador.time, i, err);
    });
  };

  this.getCurrentTime = function(timer, isSequence){
    if(isSequence){
      timer.stop();
      return timer.time;
    }
    return timer.get();
  };

  this.addResult = function(step){
    step.stats.sample = _.filter(step.stats.sample, function(item){
      return _.isNumber(item);
    });

    var result = benchmarkUtils.getRelevantFields(_.pick(step, 'name', 'href', 'stats', 'errors', 'options', 'request', 'response')),
				maxMeanErr,
				maxSingleMeanErr;

    if(!!step.options.maxMean && (result.stats.mean > step.options.maxMean)){
      maxMeanErr = {
        code: settings.errorCodes.MAX_MEAN_EXCEEDED,
        details: step.name,
        message: format(settings.errorMessages.MAX_MEAN_EXCEEDED, step.options.maxMean)
      };

      this.emit('error', maxMeanErr);

      if(!result.errors[settings.errorCodes.MAX_MEAN_EXCEEDED]) {
        result.errors[settings.errorCodes.MAX_MEAN_EXCEEDED]=[];
			}

      result.errors[settings.errorCodes.MAX_MEAN_EXCEEDED].push(maxMeanErr);
    }

    if(!!step.options.maxSingleMean && (result.stats.singleMean > step.options.maxSingleMean)){
      maxSingleMeanErr = {
        code: settings.errorCodes.MAX_SINGLE_MEAN_EXCEEDED,
        details: step.name,
        message: format(settings.errorMessages.MAX_SINGLE_MEAN_EXCEEDED, step.options.maxSingleMean)
      };

			this.emit('error', maxSingleMeanErr);

      if(!result.errors[settings.errorCodes.MAX_SINGLE_MEAN_EXCEEDED]) {
        result.errors[settings.errorCodes.MAX_SINGLE_MEAN_EXCEEDED]=[];
			}

      result.errors[settings.errorCodes.MAX_SINGLE_MEAN_EXCEEDED].push(maxSingleMeanErr);
    }

    this.results.push(result);
    this.emit('cycle', benchmarkUtils.cycleMessage(result));
    return step;
  };

  this.run = function(){
    var self = this;

    giveMe.sequence(_.map(this.steps, function(step){ return step.run; }), function(callbacks){

      var results = {};
      _.forEach(self.results, function(result, i){ results[i] = result; });

      var sorted = _.compose(benchmarkUtils.sort, benchmarkUtils.getSuccessful)(results);

      if(sorted.length > 1){
        _.find(results, function(result){ return result.name === sorted[0].name; }).isFastest = true;
        _.find(results, function(result){ return result.name === sorted[sorted.length - 1].name; }).isSlowest = true;
      }

      self.emit('complete', results);
    });
  };

  return _.extend(this, new EventsHandler());
};
