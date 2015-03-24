#! /usr/bin/env node
(function() {
  var Config, Logger, Memcached, argv, close_response, config, express, favicon, handle_request, ip_allowed, logger, memcached, mode, random_worker, request, respawn, serve, spawn, stop, url, workers;

  spawn = function(n) {
    var i, worker_config, _, _i, _len, _results;
    _results = [];
    for (i = _i = 0, _len = workers.length; _i < _len; i = ++_i) {
      _ = workers[i];
      workers[i] = {
        process: null,
        port: config.worker.port
      };
      worker_config = JSON.stringify(config.worker);
      workers[i].process = respawn(["phantomjs", "--load-images=no", "--disk-cache=no", "--ignore-ssl-errors=yes", "--ssl-protocol=any", "lib/worker.js", "--config=" + worker_config], {
        cwd: '.',
        sleep: 1000,
        stdio: [0, 1, 2],
        kill: 1000
      });
      workers[i].process.start();
      config.worker.port += 1;
      _results.push(logger.info("phear", "Worker " + (i + 1) + " of " + n + " started."));
    }
    return _results;
  };

  serve = function(port) {
    var app;
    app = express();
    app.use(favicon("assets/favicon.png"));
    app.get('/', function(req, res) {
      return handle_request(req, res);
    });
    app.listen(port);
    return logger.info("phear", "Phear started.");
  };

  handle_request = function(req, res) {
    var cache_key, cache_namespace, respond;
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if (mode !== "development" && !ip_allowed(req.headers["real-ip"])) {
      res.statusCode = 403;
      return close_response("phear", "Forbiddena.", res);
    }
    if (req.query.fetch_url == null) {
      res.statusCode = 400;
      return close_response("phear", "No URL requested, you have to set fetch_url=encoded_url.", res);
    }
    respond = function(statusCode, body) {
      var parsed_body;
      if (req.query.raw in ["true", "1"]) {
        parsed_body = JSON.parse(body);
        res.status(statusCode).send(parsed_body.content);
      } else {
        res.set("content-type", "application/json");
        res.status(statusCode).send(body);
      }
      return res.end();
    };
    cache_namespace = "global-";
    if (req.query.cache_namespace != null) {
      cache_namespace = req.query.cache_namespace;
    }
    cache_key = "" + cache_namespace + req.query.fetch_url;
    return memcached.get(cache_key, function(error, data) {
      var headers, worker, worker_request_url;
      if ((error != null) || (data == null) || req.query.force in ["true", "1"]) {
        worker = random_worker();
        headers = {};
        if (req.query.headers != null) {
          try {
            headers = JSON.parse(req.query.headers);
          } catch (_error) {
            res.statusCode = 400;
            return close_response("phear", "Additional headers not properly formatted, e.g.: encodeURIComponent('{extra: \"Yes.\"}').", res);
          }
        }
        worker_request_url = url.format({
          protocol: "http",
          hostname: "localhost",
          port: worker.port,
          query: req.query,
          headers: headers
        });
        return request({
          url: worker_request_url,
          headers: {
            'real-ip': req.headers['real-ip']
          }
        }, function(error, response, body) {
          if (response.statusCode === 200) {
            memcached.set(cache_key, body, config.cache_ttl, function() {
              return logger.info("phear", "Stored " + req.query.fetch_url + " in cache");
            });
          }
          return respond(response.statusCode, body);
        });
      } else {
        logger.info("phear", "Serving entry from cache.");
        return respond(200, data);
      }
    });
  };

  random_worker = function() {
    var worker, _ref;
    while ((worker != null ? (_ref = worker.process) != null ? _ref.status : void 0 : void 0) !== "running") {
      worker = workers[Math.floor(Math.random() * workers.length)];
    }
    return worker;
  };

  close_response = function(inst, status, response) {
    response.set("content-type", "application/json");
    logger.info(inst, "Ending process.");
    if ([400, 403, 500].indexOf(response.statusCode) > -1) {
      response.status(response.statusCode).send(JSON.stringify({
        success: false,
        reason: status
      }));
    }
    response.end();
    return logger.info(inst, "Ended process with status " + (status.toUpperCase()) + ".");
  };

  ip_allowed = function(ip) {
    return config.worker.allowed_clients.indexOf(ip) !== -1;
  };

  stop = function() {
    var worker, _i, _len;
    logger.info("phear", "Kill process and workers.");
    for (_i = 0, _len = workers.length; _i < _len; _i++) {
      worker = workers[_i];
      worker.process.stop();
    }
    return process.kill();
  };

  express = require('express');

  respawn = require('respawn');

  request = require('request');

  url = require('url');

  Memcached = require('memcached');

  favicon = require('serve-favicon');

  argv = require('yargs').usage('Parse dynamic webpages.\nUsage: $0').example('$0 -c', 'location of phear configuration file').alias('c', 'config').example('$0 -e', 'environment to run in.').alias('e', 'environment')["default"]({
    c: "./config/config.json",
    e: "development"
  }).argv;

  Logger = require("./lib/logger.js");

  Config = require("./lib/config.js");

  mode = argv.e;

  config = new Config(argv.c, mode).config;

  config.worker.environment = mode;

  logger = new Logger(config, config.base_port);

  workers = new Array(config.workers);

  memcached = new Memcached(config.memcached.servers, config.memcached.options);

  memcached.on('issue', function(f) {
    logger.info("phear", "Memcache failed: " + f.messages);
    return stop();
  });

  memcached.stats(function(_) {
    return true;
  });

  process.on('uncaughtException', function(err) {
    logger.info("phear", "UNCAUGHT ERROR: " + err.stack);
    return stop();
  });

  logger.info("phear", "Starting Phear...");

  logger.info("phear", "==================================");

  logger.info("phear", "Mode: " + mode);

  logger.info("phear", "Config file: " + argv.c);

  logger.info("phear", "Port: " + config.base_port);

  logger.info("phear", "Workers: " + config.workers);

  logger.info("phear", "==================================");

  spawn(config.workers);

  serve(config.base_port);

}).call(this);
