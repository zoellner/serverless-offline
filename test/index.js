const invokeRemoteFunction = require('./invokeRemoteFunction');
const ServerlessOffline = require('../src');

class ServerlessOfflineTester {

  constructor(serverless) {
    this.serverless = serverless;
    this.offline = new ServerlessOffline(serverless);

    this.commands = {
      'offline-tester': {
        lifecycleEvents: ['init'],
      },
    };

    this.hooks = {
      'offline-tester:init': this.init.bind(this),
    };
  }

  init() {
    console.log(`Testing Serverless-Offline using Serverless v${this.serverless.version}`);

    this.offline.start().then(() => {
      this.offline.end();
    });
    // For every tested lambda function, we assume
    // the handler name, the function name and the route path are the same
    // We call it "id"
    // const functions = Object.keys(this.serverless.service.functions)
    // .map(id => Object.assign(this.serverless.service.getFunction(id), { id }));
  }
}

module.exports = ServerlessOfflineTester;
