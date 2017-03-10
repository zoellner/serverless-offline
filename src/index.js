const { exec } = require('child_process');

const defaultOptions = {
  host: 'localhost',
  port: 3000,
  prefix: '/',
  // location: '.',
  // noTimeout: this.options.noTimeout || false,
  // noEnvironment: this.options.noEnvironment || false,
  // dontPrintOutput: this.options.dontPrintOutput || false,
  // httpsProtocol: this.options.httpsProtocol || '',
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
        lifecycleEvents: ['start', 'end'],
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
          // httpsProtocol: {
          //   usage: 'To enable HTTPS, specify directory (relative to your cwd, typically your project dir) for both cert.pem and key.pem files.',
          //   shortcut: 'H',
          // },
          // location: {
          //   usage: 'The root location of the handlers\' files.',
          //   shortcut: 'l',
          // },
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
      'offline:end': this.end.bind(this),
    };

    this.exitCode = 0;
    this.log = console.log; // TODO
  }

  // First lifecycleEvent, launches the main logic
  start() {
    this.checkVersion();
    this.createParams();
    this.buildServer();

    // Some users would like to know their environment outside of the handler
    process.env.IS_OFFLINE = true;

    return new Promise((resolve, reject) => {
      resolve();
      // this.server.start(err => {
      //   if (err) return reject(err);
      //
      //   this.log(`Offline listening on http${this.options.httpsProtocol ? 's' : ''}://${this.options.host}:${this.options.port}`);
      //
      //   resolve();
      // });
    })
    .then(() => this.options.exec ? this.executeShellScript() : this.listenForSigInt());
  }

  // Checks wether the user is using a compatible serverless version or not
  checkVersion() {
    const version = this.serverless.version;

    if (!version.startsWith('1.')) {
      this.log(`Offline requires Serverless v1.x.x but found ${version}. Exiting.`);
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

  buildServer() {
    console.log('buildServer');
  }

  // Listen for ctrl+c to stop the server
  listenForSigInt() {
    return new Promise(resolve => {
      process.on('SIGINT', () => {
        this.log('Offline Halting...');
        resolve();
      });
    });
  }

  // Some user would like to execute some script
  executeShellScript() {
    const command = this.options.exec;

    this.log(`Offline executing script [${command}]`);

    return new Promise(resolve => {
      exec(command, (error, stdout, stderr) => {
        this.log(`exec stdout: [${stdout}]`);
        this.log(`exec stderr: [${stderr}]`);

        if (error) {
          // Use the failed command's exit code, proceed as normal so that shutdown can occur gracefully
          this.log(`Offline error executing script [${error}]`);
          this.exitCode = error.code || 1;
        }

        resolve();
      });
    });
  }


  end(exitCode = 0) {
    this.log('Halting offline server');
    this.server.stop({ timeout: 5000 })
    .then(() => process.exit(exitCode));
  }
}

module.exports = ServerlessOffline;
