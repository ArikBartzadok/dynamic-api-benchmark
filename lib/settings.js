'use strict';

module.exports = {
  errorCodes: {
    HTTP_STATUS_CODE_NOT_MATCHING: 'httpStatusCodeNotMatching',
    MAX_MEAN_EXCEEDED: 'maxMeanExceeded',
    MAX_SINGLE_MEAN_EXCEEDED: 'maxSingleMeanExceeded'
  },
  errorMessages: {
    GENERIC_ERROR: 'Ocorreu um erro durante o benchmarking {0}: {1}',
    HTTP_STATUS_CODE_NOT_MATCHING: 'O código de status esperado era {0} mas foi obtido {1} de {2}',
    MAX_MEAN_EXCEEDED: 'A média deve estar abaixo {0}',
    MAX_SINGLE_MEAN_EXCEEDED: 'A média em todas as solicitações simultâneas deve ser inferior a {0}',
    VALIDATION_CALLBACK: 'O argumento de callback não é válido',
    VALIDATION_ENDPOINTS: 'Os argumentos dos endpoints não são válidos',
    VALIDATION_ENDPOINT_VERB: 'O argumento do endpoint não é válido - foi encontrado um verbo HTTP não suportado',
    VALIDATION_SERVICES: 'O argumento de serviços não é válido'
  },
  successMessages: {
    FASTEST_ENDPOINT: 'O mais rápido é {0}',
    FASTEST_SERVICE: 'O serviço mais rápido é {0}',
    CYCLE_MESSAGE: '{0} x {1} operações/segundo {2}% ({3} executadas{4} amostras)'
  }
};
