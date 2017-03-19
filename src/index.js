const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const Hapi = require('hapi');
const hapiCorsHeaders = require('hapi-cors-headers');

const { loadRequestTemplates, loadResponseTemplates } = require('./loadTemplates');
const createVelocityContext = require('./createVelocityContext');
const renderVelocityTemplateObject = require('./renderVelocityTemplateObject');


class ServerlessOffline {

  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options || {};
    this.requests = {};

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
          skipCacheInvalidation: {
            usage: 'Tells the plugin to skip require cache invalidation. A script reloading tool like Nodemon might then be needed',
          },
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
          corsOrigin: {
            usage: 'Allows to specify the Access-Control-Allow-Origin header for CORS support. Default: "*"',
          },
          corsHeaders: {
            usage: 'Allows to specify the Access-Control-Allow-Headers header for CORS support. Default: "accept,content-type,x-api-key"',
          },
          noCorsCredentials: {
            usage: 'Used to override the Access-Control-Allow-Credentials default (which is true) to false.',
          },
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

  /* ------------------
    Life cycle events
  ------------------ */

  // First lifecycleEvent, launches the main logic
  start() {
    this.checkVersionAndRuntime();
    this.createParams();
    this.createServer();
    this.createRoutes();
    this.create404Route();

    // Some users would like to know their environment outside of the handler
    process.env.IS_OFFLINE = true;

    return this.server.start()
    .then(() => {
      this.log(`Offline listening on http${this.params.httpsDir ? 's' : ''}://${this.params.host}:${this.params.port}`);
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

  // Last lifecycleEvent, we kill the server and exit the process
  end() {
    this.log('Halting server...');

    return this.server.stop()
    .then(() => process.exit(this.exitCode));
  }

  /* -----
    Main
  ----- */

  // Checks wether the user is using a compatible serverless version or not
  checkVersionAndRuntime() {
    const supportedRuntimes = ['nodejs', 'nodejs4.3'];
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
    this.params = Object.assign({
      host: 'localhost',
      port: 3000,
      prefix: '/',
      location: '.',
      corsOrigin: '*',
      corsHeaders: 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      noCorsCredentials: false,
      // noTimeout: this.options.noTimeout || false,
      // noEnvironment: this.options.noEnvironment || false,
      // dontPrintOutput: this.options.dontPrintOutput || false,
      skipCacheInvalidation: false,
      // corsOrigin: this.options.corsOrigin || '*',
      // corsHeaders: this.options.corsHeaders || 'accept,content-type,x-api-key',
      // corsAllowCredentials: true,
      // apiKey: this.options.apiKey || crypto.createHash('md5').digest('hex'),
    }, this.options);

    // Prefix must start and end with '/'
    if (!this.params.prefix.startsWith('/')) this.params.prefix = `/${this.params.prefix}`;
    if (!this.params.prefix.endsWith('/')) this.params.prefix += '/';

    // Parse CORS options
    // https://hapijs.com/api/14.2.0#route-options
    this.params.cors = {
      origin: this.params.corsOrigin.replace(/\s/g, '').split(','),
      headers: this.params.corsHeaders.replace(/\s/g, '').split(','),
      credentials: !this.params.noCorsCredentials,
    };

    // Locate service directory
    this.params.servicePath = path.join(this.serverless.config.servicePath, this.params.location);

    // Save shared env vars
    this.params.environment = this.serverless.service.provider.environment || {};

    console.log(this.serverless.service.provider);
    console.log(this.serverless.service);

    // Velocity options
    this.params.velocity = {
      stage: this.serverless.service.provider.stage,
      stageVariables: this.serverless.service.custom && this.serverless.service.custom.stageVariables || {},
    };
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
    Object.keys(this.serverless.service.functions).forEach(id => {

      const functionDefinition = this.serverless.service.getFunction(id);
      const [handlerFileName, handlerName] = functionDefinition.handler.split('.');

      Object.assign(functionDefinition, {
        id,
        handlerName,
        handlerPath: `${this.params.servicePath}/${handlerFileName}`,
        timeout: (functionDefinition.timeout || 30) * 1000,
        environment: Object.assign(this.params.environment, functionDefinition.environment),
      });
      // console.log(functionDefinition);

      this.log();
      this.log(`Routes for ${id}:`);

      // Adds a route for each HTTP endpoint
      functionDefinition.events.forEach(eventDefinition => {

        const endpointDefinition = eventDefinition.http;

        if (!endpointDefinition) return;

        let path, method, integration, requestTemplates, responseTemplates;

        // Handle one-liner setups like - http: GET users/index
        if (typeof endpointDefinition === 'string') [method, path] = endpointDefinition.split(' ');
        else ({ method, path, integration } = endpointDefinition);

        method = method.toUpperCase();

        // Prefix must start and end with '/' but path must not end with '/'
        path = this.params.prefix + (path.startsWith('/') ? path.slice(1) : path);
        if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1);

        this.log(`- ${method} ${path}`);

        // We make more transformation after logging meaningful info
        path = path.replace(/\+}/g, '*}');
        if (method === 'ANY') method = '*';
        integration = integration || 'lambda-proxy';

        if (endpointDefinition.authorizer) {
          // TODO
        }

        if (integration === 'lambda') {
          requestTemplates = loadRequestTemplates(functionDefinition, endpointDefinition);
          responseTemplates = loadResponseTemplates(functionDefinition, endpointDefinition);
        }

        // CORS shenanigans
        // https://hapijs.com/api/14.2.0#route-options
        // https://serverless.com/framework/docs/providers/aws/events/apigateway/#enabling-cors
        let cors = null;

        if (endpointDefinition.cors === true) {
          cors = this.params.cors;
        }
        else if (typeof endpointDefinition.cors === 'object') {
          // Small difference between Serverless and Hapi APIS
          if (endpointDefinition.cors.origins) {
            endpointDefinition.cors.origin = endpointDefinition.cors.origins;
            delete endpointDefinition.cors.origins;
          }

          cors = Object.assign(this.params.cors, endpointDefinition.cors);
        }

        // Route creation
        this.server.route({
          method,
          path,
          config: { cors },
          handler: this.createRouteHandler(functionDefinition, integration, requestTemplates, responseTemplates),
        });
      });
    });
  }

  createRouteHandler(functionDefinition, integration, requestTemplates, responseTemplates) {

    return (request, reply) => {
      console.log('new request', functionDefinition.id);
      // Shared mutable state is the root of all evil they say
      const requestId = Math.random().toString().slice(2);
      this.requests[requestId] = { done: false };
      this.currentRequestId = requestId;

      // Holds the response to do async op
      const response = reply.response().hold();
      const contentType = request.mime || 'application/json';

      // Some content-type require payload parsing
      if (['application/json', 'application/vnd.api+json'].includes(contentType)) {
        try {
          request.payload = JSON.parse(request.payload);
        }
        catch (err) {
          this.log('error in converting request.payload to JSON:', err);
        }
      }

      /* ---------------------
        Handler lazy loading
      --------------------- */

      let handler;

      if (!this.params.skipCacheInvalidation) {
        for (const key in require.cache) {
          if (!key.includes('node_modules')) delete require.cache[key];
        }
      }

      try {
        handler = require(functionDefinition.handlerPath)[functionDefinition.handlerName];
      }
      catch (err) {
        this.log(`Error while loading ${functionDefinition.id}`);

        return this.reply500(response, err, requestId);
      }

      if (typeof handler !== 'function') {
        this.log(`Error while loading ${functionDefinition.id}`);

        return this.reply500(response, new Error(`Serverless-offline: handler for '${functionDefinition.id}' is not a function`), requestId);
      }

      /* -----------------
        Event population
      ----------------- */

      let event = {};

      if (integration === 'lambda') {
        try {
          // Velocity templating language parsing
          const requestTemplate = requestTemplates[contentType] || '';
          const velocityContext = createVelocityContext(request, this.params.velocity, request.payload);

          event = renderVelocityTemplateObject(requestTemplate, velocityContext);
        }
        catch (err) {
          this.log(`Error while parsing template "${contentType}" for ${functionDefinition.id}`);

          return this.reply500(response, err, requestId);
        }
      }
      else if (integration === 'lambda-proxy') {
        event = createLambdaProxyContext(request, this.options, this.velocityContextOptions.stageVariables);
      }

      event.isOffline = true;

      if (this.serverless.service.custom && this.serverless.service.custom.stageVariables) {
        event.stageVariables = this.serverless.service.custom.stageVariables;
      }
      else if (integration !== 'lambda-proxy') {
        event.stageVariables = {};
      }

      response.send();
    };
  }

  create404Route() {
    // If a {proxy+} route exists, don't conflict with it
    if (this.server.match('*', '/{p*}')) return;

    this.server.route({
      method: '*',
      path: '/{p*}',
      config: { cors: this.params.corsConfig },
      handler: (request, reply) => {
        const response = reply({
          statusCode: 404,
          error: 'Serverless-offline: route not found.',
          currentRoute: `${request.method} - ${request.path}`,
          existingRoutes: this.server.table()[0].table
            .filter(route => route.path !== '/{p*}') // Exclude this (404) route
            .sort((a, b) => a.path <= b.path ? -1 : 1) // Sort by path
            .map(route => `${route.method} - ${route.path}`), // Human-friendly result
        });
        response.statusCode = 404;
      },
    });
  }

  clearRequest(requestId) {
    const timeout = this.requests[requestId].timeout;

    if (timeout && timeout._called) return true;

    clearTimeout(timeout);

    this.requests[requestId].done = true;
  }

  // Bad news
  reply500(response, err, requestId) {
    if (this.clearRequest(requestId)) return;

    console.log(err.stackTrace || err);

    /* eslint-disable no-param-reassign */
    // APIG replies 200 by default on failures
    response.statusCode = 200;
    response.source = {
      errorMessage: err.message,
      errorType: err.constructor.name,
      stackTrace: err.stack,
      offlineInfo: 'If you believe this is an issue with the plugin please submit it, thanks. https://github.com/dherault/serverless-offline/issues',
    };
    /* eslint-enable no-param-reassign */

    this.log('Replying error in handler');

    response.send();
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

}

module.exports = ServerlessOffline;
