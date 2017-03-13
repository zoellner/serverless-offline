const { invokeRemoteFunction, invokeLocalFunction } = require('./invokeFunction');
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

    // For every tested lambda function, we assume
    // the handler name, the function name and the route path are the same
    // We call it "id"
    const functions = Object.keys(this.serverless.service.functions)
    .map(id => Object.assign(this.serverless.service.getFunction(id), { id }));

    this.offline.start().then(() => {
      invokeLocalFunction({
        name: functions[0].id,
        method: 'get',
      })
      .then(() => {
        this.offline.end();
      });
    });
  }
}

module.exports = ServerlessOfflineTester;
