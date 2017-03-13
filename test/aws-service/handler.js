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
  cb(null, { message: 'Serverless-offline FTW! lambda integration', event });
};

module.exports.basicLambda500 = (event, context, cb) => {
  cb(new Error('[500] Fake internal server error. lambda integration'));
};

module.exports.getLambdaProxy = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Serverless-offline FTW! get-only lambda-proxy integration',
      input: event,
    }),
  };

  callback(null, response);
};

module.exports.postLambdaProxy = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Serverless-offline FTW! post-only lambda-proxy integration',
      input: event,
    }),
  };

  callback(null, response);
};

module.exports.getAndPostLambdaProxy = (event, context, callback) => {
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

module.exports.requestTemplateLambda = (event, context, cb) => {
  cb(null, { message: 'Serverless-offline FTW! lambda integration with request template', event });
};

module.exports.requestTemplateFileLambda = (event, context, cb) => {
  cb(null, { message: 'Serverless-offline FTW! lambda integration with request template file', event });
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
