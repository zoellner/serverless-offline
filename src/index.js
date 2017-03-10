const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const Hapi = require('hapi');
const hapiCorsHeaders = require('hapi-cors-headers');

const supportedRuntimes = ['nodejs', 'nodejs4.3'];
const defaultOptions = {
  host: 'localhost',
  port: 3000,
  prefix: '/',
  location: '.',
  // noTimeout: this.options.noTimeout || false,
  // noEnvironment: this.options.noEnvironment || false,
  // dontPrintOutput: this.options.dontPrintOutput || false,
  // skipCacheInvalidation: this.options.skipCacheInvalidation || false,
  // corsAllowOrigin: this.options.corsAllowOrigin || '*',
  // corsAllowHeaders: this.options.corsAllowHeaders || 'accept,content-type,x-api-key',
  // corsAllowCredentials: true,
  // apiKey: this.options.apiKey || crypto.createHash('md5').digest('hex'),
};

class ServerlessOffline {

  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options || {};

    this.commands = {
      offline: {
        usage: 'Simulates API Gateway to call your lambda functions locally.',
        lifecycleEvents: ['start', 'wait-or-execute-script', 'end'],
        options: {
          host: {
            usage: 'Host name to listen on. Default: localhost',
            shortcut: 'o',
          },
          port: {
            usage: 'Port to listen on. Default: 3000',
            shortcut: 'P',
          },
          prefix: {
            usage: 'Adds a prefix to every path, to send your requests to http://localhost:3000/prefix/[your_path] instead.',
            shortcut: 'p',
          },
          // skipCacheInvalidation: {
          //   usage: 'Tells the plugin to skip require cache invalidation. A script reloading tool like Nodemon might then be needed',
          //   shortcut: 'c',
          // },
          location: {
            usage: 'The root location of the handlers\' files.',
            shortcut: 'l',
          },
          httpsDir: {
            usage: 'To enable HTTPS, specify directory (relative to your cwd, typically your project dir) for both cert.pem and key.pem files.',
          },
          // noTimeout: {
          //   usage: 'Disable the timeout feature.',
          //   shortcut: 't',
          // },
          // noEnvironment: {
          //   usage: 'Turns of loading of your environment variables from serverless.yml. Allows the usage of tools such as PM2 or docker-compose.',
          // },
          // dontPrintOutput: {
          //   usage: 'Turns of logging of your lambda outputs in the terminal.',
          // },
          // corsAllowOrigin: {
          //   usage: 'Used to build the Access-Control-Allow-Origin header for CORS support.',
          // },
          // corsAllowHeaders: {
          //   usage: 'Used to build the Access-Control-Allow-Headers header for CORS support.',
          // },
          // corsDisallowCredentials: {
          //   usage: 'Used to override the Access-Control-Allow-Credentials default (which is true) to false.',
          // },
          // apiKey: {
          //   usage: 'Defines the api key value to be used for endpoints marked as private. Defaults to a random hash.',
          // },
          exec: {
            usage: 'When provided, a shell script is executed when the server starts up, and the server will shut domn after handling this command.',
          },
        },
      },
    };

    this.hooks = {
      'offline:start': this.start.bind(this),
      'offline:wait-or-execute-script': this.waitOrExecuteScript.bind(this),
      'offline:end': this.end.bind(this),
    };

    this.exitCode = 0;
    this.log = console.log; // TODO
  }

  // First lifecycleEvent, launches the main logic
  start() {
    this.checkVersionAndRuntime();
    this.createParams();
    this.createServer();
    this.createRoutes();

    // Some users would like to know their environment outside of the handler
    process.env.IS_OFFLINE = true;

    return this.server.start()
    .then(() => {
      this.log(`Offline listening on http${this.params.httpsDir ? 's' : ''}://${this.params.host}:${this.params.port}`);
    });
  }

  // Checks wether the user is using a compatible serverless version or not
  checkVersionAndRuntime() {
    const { version, service: { provider: { runtime } } } = this.serverless;

    if (!version.startsWith('1.')) {
      this.log(`Offline requires Serverless v1.x.x but found ${version}. Exiting.`);
      process.exit(0);
    }

    if (!supportedRuntimes.includes(runtime)) {
      this.log(`Offline only supports the following runtimes: ${supportedRuntimes}. Found ${runtime} runtime. Exiting.`);
      process.exit(0);
    }
  }

  createParams() {
    console.log('this.options:', this.options);
    this.params = Object.assign(defaultOptions, this.options);

    // Prefix must start and end with '/'
    if (!this.params.prefix.startsWith('/')) this.params.prefix = `/${this.params.prefix}`;
    if (!this.params.prefix.endsWith('/')) this.params.prefix += '/';
  }

  createServer() {
    // Hapijs server creation
    this.server = new Hapi.Server({
      connections: {
        router: {
          stripTrailingSlash: true, // removes trailing slashes on incoming paths.
        },
      },
    });

    const { host, port, httpsDir } = this.params;
    const connectionOptions = { host, port };

    // HTTPS support
    if (httpsDir) {
      connectionOptions.tls = {
        key: fs.readFileSync(path.resolve(httpsDir, 'key.pem'), 'ascii'),
        cert: fs.readFileSync(path.resolve(httpsDir, 'cert.pem'), 'ascii'),
      };
    }

    this.server.connection(connectionOptions);

    // Enable CORS preflight response
    this.server.ext('onPreResponse', hapiCorsHeaders);
  }

  createRoutes() {
    const servicePath = path.join(this.serverless.config.servicePath, this.params.location);

    Object.keys(this.serverless.service.functions).forEach(id => {

      const functionDefinition = this.serverless.service.getFunction(id);

      this.log(`Routes for ${id}:`);

      // Adds a route for each HTTP endpoint
      functionDefinition.events.forEach(eventDefinition => {

        if (!eventDefinition.http) return;

        // Handle one-liner setups like - http: GET users/index
        if (typeof eventDefinition.http === 'string') {
          const [method, path] = eventDefinition.http.split(' ');

          eventDefinition.http = { method, path };
        }

        console.log(eventDefinition);

      });
    });
  }

  // Some user would like to execute some script
  executeShellScript() {
    const command = this.params.exec;

    this.log(`Offline executing script [${command}]`);

    return new Promise(resolve => {
      cp.exec(command, (error, stdout, stderr) => {
        if (stderr) this.log(stderr);
        if (stdout) this.log(stdout);

        if (error) {
          // Use the failed command's exit code, proceed as normal so that shutdown can occur gracefully
          this.log(`Error while executing script [${command}]`);
          this.log(error);
          this.exitCode = error.code || 1;
        }

        resolve();
      });
    });
  }

  // When the server is up, we either execute some user-defined script
  // (ex: for testing) or we wait for SIGINT (ctrl + c) before
  // proceeding to the next step (killing the server)
  waitOrExecuteScript() {
    return new Promise(resolve => {
      const command = this.params.exec;

      if (command) {
        this.log(`Executing "${command}"`);

        cp.exec(command, (error, stdout, stderr) => {
          if (stderr) console.log(stderr);
          if (stdout) console.log(stdout);

          if (error) {
            // Use the failed command's exit code, proceed as normal so that shutdown can occur gracefully
            this.log(`Error while executing "${command}"`);
            console.log(error);
            this.exitCode = error.code || 1;
          }

          resolve();
        });
      }

      process.on('SIGINT', resolve);
    });
  }

  end() {
    this.log('Halting server...');

    return this.server.stop()
    .then(() => process.exit(this.exitCode));
  }
}

module.exports = ServerlessOffline;
