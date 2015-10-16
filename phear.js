#! /usr/bin/env node
(function() {
  var Config, Logger, Memcached, Stats, active_request_handlers, argv, basic_auth, close_response, config, do_with_random_worker, express, get_running_workers, handle_request, ip_allowed, logger, memcached, memcached_options, mode, mommy, next_thread_number, package_definition, request, respawn, serve, spawn, stats, stop, tree_kill, url, workers,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  spawn = function(n) {
    var _, i, j, len, results, worker_config;
    results = [];
    for (i = j = 0, len = workers.length; j < len; i = ++j) {
      _ = workers[i];
      workers[i] = {
        process: null,
        port: config.worker.port
      };
      worker_config = JSON.stringify(config.worker);
      workers[i].process = respawn(["phantomjs", "--disk-cache=no", "--ignore-ssl-errors=yes", "--ssl-protocol=any", "lib/worker.js", "--config=" + worker_config], {
        cwd: '.',
        sleep: 1000,
        stdio: [0, 1, 2],
        kill: 1000
      });
      workers[i].process.start();
      config.worker.port += 1;
      results.push(logger.info("phear", "Worker " + (i + 1) + " of " + n + " started."));
    }
    return results;
  };

  serve = function(port) {
    var app;
    app = express();
    app.set('view engine', 'jade');
    app.set('views', './lib/views');
    app.use(express["static"]('assets'));
    app.get('/', function(req, res) {
      var running_workers_count;
      running_workers_count = get_running_workers().length;
      if (active_request_handlers >= running_workers_count * config.worker.max_connections) {
        res.statusCode = 503;
        return close_response("phear", "Service unavailable, maximum number of allowed connections reached.", res, true);
      } else {
        return handle_request(req, res);
      }
    });
    app.get('/status/:sub?', function(req, res) {
      var allowed_routes, get_worker_states, ref, ref1, user;
      if (mode !== "development") {
        if ((ref = config.status_page) != null ? ref.enabled : void 0) {
          user = basic_auth(req);
          if ((user != null ? user.pass : void 0) !== config.status_page.pass || (user != null ? user.name : void 0) !== config.status_page.name) {
            res.statusCode = 401;
            res.header('WWW-Authenticate', 'Basic realm=\nUsername and password please.');
            return res.end();
          }
        } else {
          res.statusCode = 403;
          return close_response("phear", "Forbidden.", res, true);
        }
      }
      stats.requests.active = active_request_handlers;
      stats.workers = workers;
      allowed_routes = ['general', 'workers', 'config'];
      if (ref1 = req.params.sub, indexOf.call(allowed_routes, ref1) < 0) {
        req.params.sub = 'general';
      }
      get_worker_states = req.params.sub === "workers";
      return stats.get(get_worker_states, function() {
        return res.render(req.params.sub + ".jade", {
          stats: stats,
          sub: req.params.sub
        });
      });
    });
    app.listen(port);
    return logger.info("phear", "Phear started.");
  };

  handle_request = function(req, res) {
    var cache_key, cache_namespace, error1, respond, thread_number;
    thread_number = next_thread_number();
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if (mode !== "development" && !ip_allowed(req.headers["real-ip"])) {
      res.statusCode = 403;
      return close_response("phear-" + thread_number, "Forbidden.", res);
    }
    if (req.query.fetch_url == null) {
      res.statusCode = 400;
      return close_response("phear-" + thread_number, "No URL requested, you have to set fetch_url=encoded_url.", res);
    }
    if (req.query.headers != null) {
      try {
        JSON.parse(req.query.headers);
      } catch (error1) {
        res.statusCode = 400;
        return close_response("phear-" + thread_number, "Additional headers not properly formatted, e.g.: encodeURIComponent('{extra: \"Yes.\"}').", res);
      }
    }
    respond = function(statusCode, body) {
      var parsed_body, ref;
      if ((ref = req.query.raw) === "true" || ref === "1") {
        parsed_body = JSON.parse(body);
        res.status(statusCode).send(parsed_body.content);
      } else {
        res.set("content-type", "application/json");
        res.status(statusCode).send(body);
      }
      res.end();
      stats.requests.ok += 1;
      return active_request_handlers -= 1;
    };
    active_request_handlers += 1;
    cache_namespace = "global-";
    if (req.query.cache_namespace != null) {
      cache_namespace = req.query.cache_namespace;
    }
    cache_key = "" + cache_namespace + req.query.fetch_url;
    return memcached.get(cache_key, function(error, data) {
      var ref;
      if ((error != null) || (data == null) || ((ref = req.query.force) === "true" || ref === "1")) {
        return do_with_random_worker(thread_number, function(worker) {
          var options, worker_request_url;
          worker_request_url = url.format({
            protocol: "http",
            hostname: "localhost",
            port: worker.port,
            query: req.query
          });
          options = {
            url: worker_request_url,
            headers: {
              'real-ip': req.headers['real-ip']
            },
            timeout: config.global_timeout
          };
          return request(options, function(error, response, body) {
            var err, error2, ref1;
            try {
              if (response.statusCode === 200) {
                memcached.set(cache_key, body, config.cache_ttl, function() {
                  return logger.info("phear-" + thread_number, "Stored " + req.query.fetch_url + " in cache");
                });
              }
              return respond(response.statusCode, body);
            } catch (error2) {
              err = error2;
              res.statusCode = 500;
              close_response("phear-" + thread_number, "Request failed due to an internal server error.", res);
              if ((ref1 = worker.process.status) !== "stopping" && ref1 !== "stopped") {
                logger.info("phear-" + thread_number, "Trying to restart worker with PID " + worker.process.pid + "...");
                worker.process.stop(function() {
                  if (worker.process.status === "stopped") {
                    worker.process.start();
                    return logger.info("phear-" + thread_number, "Restarted worker with PID " + worker.process.pid + ".");
                  }
                });
              } else {
                logger.info("phear-" + thread_number, "Worker with PID " + worker.process.pid + " is being restarted...");
              }
              return active_request_handlers -= 1;
            }
          });
        });
      } else {
        logger.info("phear-" + thread_number, "Serving entry from cache.");
        return respond(200, data);
      }
    });
  };

  do_with_random_worker = function(thread_number, callback) {
    var running_workers;
    running_workers = get_running_workers();
    if (running_workers.length > 0) {
      return callback(running_workers[Math.floor(Math.random() * running_workers.length)]);
    } else {
      logger.info("phear-" + thread_number, "No running workers, waiting for a new worker to come up.");
      return setTimeout((function() {
        return do_with_random_worker(thread_number, callback);
      }), 500);
    }
  };

  get_running_workers = function() {
    var j, len, results, worker;
    results = [];
    for (j = 0, len = workers.length; j < len; j++) {
      worker = workers[j];
      if (worker.process.status === "running") {
        results.push(worker);
      }
    }
    return results;
  };

  close_response = function(inst, status, response, refused) {
    if (refused == null) {
      refused = false;
    }
    response.set("content-type", "application/json");
    logger.info(inst, "Ending process.");
    if ([400, 403, 500, 503].indexOf(response.statusCode) > -1) {
      response.status(response.statusCode).send(JSON.stringify({
        success: false,
        reason: status
      }));
    }
    response.end();
    if (refused) {
      stats.requests.refuse += 1;
    } else {
      stats.requests.fail += 1;
    }
    return logger.info(inst, "Ended process with status " + (status.toUpperCase()) + ".");
  };

  next_thread_number = function() {
    return mommy.handler_thread_number = mommy.handler_thread_number > 10000 ? 1 : mommy.handler_thread_number + 1;
  };

  ip_allowed = function(ip) {
    return config.worker.allowed_clients.indexOf(ip) !== -1;
  };

  stop = function() {
    logger.info("phear", "Trying to kill process and " + workers.length + " workers gently...");
    return tree_kill(process.pid, 'SIGTERM', function() {
      logger.info("phear", "Trying to kill process and workers forcefully...");
      return tree_kill(process.pid, 'SIGKILL');
    });
  };

  basic_auth = require('basic-auth');

  express = require('express');

  Memcached = require('memcached');

  package_definition = require('./package.json');

  request = require('request');

  respawn = require('respawn');

  tree_kill = require('tree-kill');

  url = require('url');

  argv = require('yargs').usage('Parse dynamic webpages.\nUsage: $0').example('$0 -c', 'location of phear configuration file').alias('c', 'config').example('$0 -e', 'environment to run in.').alias('e', 'environment')["default"]({
    c: "./config/config.json",
    e: "development"
  }).argv;

  Logger = require("./lib/logger.js");

  Config = require("./lib/config.js");

  Stats = require("./lib/stats.js");

  mode = argv.e;

  config = new Config(argv.c, mode).config;

  config.worker.environment = mode;

  logger = new Logger(config, config.base_port);

  workers = new Array(config.workers);

  memcached_options = config.memcached.options;

  memcached_options.poolSize = config.workers * 10;

  memcached = new Memcached(config.memcached.servers, memcached_options);

  memcached.on('issue', function(f) {
    logger.info("phear", "Memcache failed: " + f.messages);
    return stop();
  });

  memcached.stats(function(_) {
    return true;
  });

  process.on('uncaughtException', function(err) {
    logger.error("phear", "UNCAUGHT ERROR: " + err.stack);
    return stop();
  });

  logger.info("phear", "Starting Phear...");

  logger.info("phear", "==================================");

  logger.info("phear", "Version: " + package_definition.version);

  logger.info("phear", "Mode: " + mode);

  logger.info("phear", "Config file: " + argv.c);

  logger.info("phear", "Port: " + config.base_port);

  logger.info("phear", "Workers: " + config.workers);

  logger.info("phear", "==================================");

  mommy = this;

  mommy.handler_thread_number = 0;

  active_request_handlers = 0;

  stats = new Stats({
    general: {
      mode: mode,
      version: package_definition.version,
      config_file: argv.c,
      port: config.base_port
    },
    config: config
  });

  spawn(config.workers);

  serve(config.base_port);

}).call(this);
