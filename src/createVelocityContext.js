// const utils = require('./utils');
const jsonPath = require('./jsonPath');
const jsEscapeString = require('js-string-escape');

function escapeJavaScript(x) {
  if (typeof x === 'string') return jsEscapeString(x).replace(/\\n/g, '\n'); // See #26,
  else if (typeof x === 'object') {
    const result = {};

    for (const key in x) {
      result[key] = jsEscapeString(x[key]);
    }

    return JSON.stringify(result); // Is this really how APIG does it?
  }
  else if (typeof x.toString === 'function') return escapeJavaScript(x.toString());

  return x;
}

/*
  Returns a context object that mocks APIG mapping template reference
  http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html
*/
function createVelocityContext(request, options, payload) {

  const path = x => jsonPath(payload || {}, x);
  const authPrincipalId = request.auth && request.auth.credentials && request.auth.credentials.user;

  // Capitalize request.headers as NodeJS use lowercase headers
  // however API Gateway always pass capitalize headers
  const headers = utils.capitalizeKeys(request.headers);

  return {
    context: {
      apiId: 'offlineContext_apiId',
      authorizer: {
        principalId: authPrincipalId || process.env.PRINCIPAL_ID || 'offlineContext_authorizer_principalId', // See #24
      },
      httpMethod: request.method.toUpperCase(),
      identity: {
        accountId: 'offlineContext_accountId',
        apiKey: 'offlineContext_apiKey',
        caller: 'offlineContext_caller',
        cognitoAuthenticationProvider: 'offlineContext_cognitoAuthenticationProvider',
        cognitoAuthenticationType: 'offlineContext_cognitoAuthenticationType',
        sourceIp: request.info.remoteAddress,
        user: 'offlineContext_user',
        userAgent: request.headers['user-agent'] || '',
        userArn: 'offlineContext_userArn',
      },
      requestId: `offlineContext_requestId_${Math.random().toString(10).slice(2)}`,
      resourceId: 'offlineContext_resourceId',
      resourcePath: request.route.path,
      stage: options.stage,
    },
    input: {
      path,
      body: payload,
      json: x => JSON.stringify(path(x)),
      params(x) {
        if (typeof x === 'string') return request.params[x] || request.query[x] || headers[x];

        return {
          path: Object.assign({}, request.params),
          querystring: Object.assign({}, request.query),
          header: headers,
        };
      },
    },
    stageVariables: options.stageVariables,
    util: {
      escapeJavaScript,
      urlEncode: encodeURI,
      urlDecode: decodeURI,
      base64Encode: x => new Buffer(x.toString(), 'binary').toString('base64'),
      base64Decode: x => new Buffer(x.toString(), 'base64').toString('binary'),
      parseJson: JSON.parse,
    },
  };
}

module.exports = createVelocityContext;
