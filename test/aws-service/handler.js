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

module.exports.getLamdaProxy = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Serverless-offline FTW! get-only lambda-proxy integration',
      input: event,
    }),
  };

  callback(null, response);
};

module.exports.postLamdaProxy = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Serverless-offline FTW! post-only lambda-proxy integration',
      input: event,
    }),
  };

  callback(null, response);
};

module.exports.getAndPostLamdaProxy = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Serverless-offline FTW! get and post-only lambda-proxy integration',
      input: event,
    }),
  };

  callback(null, response);
};

module.exports.environmentLambdaProxy = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Serverless-offline FTW! environment lambda-proxy integration',
      environment: process.env,
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
