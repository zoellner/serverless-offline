'use strict';

// A basic lambda-proxy handler
module.exports.basicLambdaProxy = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Serverless-offline FTW! lambda-proxy integration',
      input: event,
    }),
  };

  callback(null, response);
};

module.exports.basicLambdaProxy500 = (event, context, callback) => {
  const response = {
    statusCode: 500,
    body: JSON.stringify({
      message: 'Fake internal server error. lambda-proxy integration',
      input: event,
    }),
  };

  callback(null, response);
};

module.exports.basicLambda = (event, context, cb) => {
  cb(null, { message: 'Serverless-offline FTW! lambda-proxy integration', event });
};

module.exports.basicLambda500 = (event, context, cb) => {
  cb(new Error('[500] Fake internal server error. lambda-proxy integration'));
};

module.exports.getOnlyLamdaProxy = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Serverless-offline FTW! get-only lambda-proxy integration',
      input: event,
    }),
  };

  callback(null, response);
};

module.exports.postOnlyLamdaProxy = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Serverless-offline FTW! post-only lambda-proxy integration',
      input: event,
    }),
  };

  callback(null, response);
};

module.exports.catchAll = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Serverless-offline FTW! Catch-all lambda-proxy integration',
      input: event,
    }),
  };

  callback(null, response);
};
