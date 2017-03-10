const invokeRemoteFunction = require('./invokeRemoteFunction');
const awsServiceHandlers = require('./aws-service/handler');

class ServerlessOfflineTester {

  constructor(serverless) {
    this.serverless = serverless;

    this.commands = {
      'offline-tester': {
        lifecycleEvents: ['start'],
      },
    };

    this.hooks = {
      'offline-tester:start': this.start.bind(this),
    };
  }

  start() {
    // For every lambda function, we assume the handler name, the function name and the route path are the same
    const handlerNames = Object.keys(awsServiceHandlers);

    console.log(`Testing Serverless-Offline using Serverless v${this.serverless.version}`);

    // console.log(this.serverless);

    const functions = Object.keys(this.serverless.service.functions)
    .map(id => Object.assign(this.serverless.service.getFunction(id), { id }));

    console.log(functions);
  }
}

module.exports = ServerlessOfflineTester;
