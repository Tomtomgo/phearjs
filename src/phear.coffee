#
# Phear.js
# -------------
# This is the main PhearJS process. It serves and controls the PhantomJS workers.
#
# For setup info see INSTALLATION.md
# For usage info see README.md
#

# Spawn n PhantomJS processes
spawn = (n) ->
  for _, i in workers
    workers[i] = {process: null, port: config.worker.port}
    worker_config = JSON.stringify(config.worker)

    # Create worker object
    workers[i].process = respawn(["phantomjs",
                                  # "--load-images=no", # Due to an issue in QT a memory leak occurs with this. Re-enable when solved. Info: https://github.com/ariya/phantomjs/issues/12903.
                                  "--disk-cache=no",
                                  "--ignore-ssl-errors=yes",
                                  "--ssl-protocol=any",
                                  "lib/worker.js",
                                  "--config=#{worker_config}"], {
      cwd: '.',
      sleep:1000,
      stdio: [0,1,2],
      kill: 1000
    })

    # Start the worker and increment port number for next worker
    workers[i].process.start()
    config.worker.port += 1

    logger.info "phear", "Worker #{i+1} of #{n} started."

# Express server running on http://localhost:port to handle fetch requests
serve = (port) ->
  app = express()
  app.set('view engine', 'jade')
  app.set('views', './lib/views')
  app.use(express.static('assets'))

  app.get '/', (req, res) ->
    running_workers_count = get_running_workers().length

    # Check that we aren't overserving our workers
    if active_request_handlers >= running_workers_count * config.worker.max_connections
      res.statusCode = 503
      return close_response("phear", "Service unavailable, maximum number of allowed connections reached.", res, true)
    else
      handle_request(req, res)

  app.get '/status/:sub?', (req, res) ->
    # For non-development environments we check if the status page is enabled and then the
    # basic auth credentials
    if mode != "development"
      if config.status_page?.enabled
        user = basic_auth req
        if user?.pass != config.status_page.pass or user?.name != config.status_page.name
          res.statusCode = 401
          res.header('WWW-Authenticate', 'Basic realm=\nUsername and password please.')
          return res.end()
      else
        res.statusCode = 403
        return close_response("phear", "Forbidden.", res, true)

    stats.requests.active = active_request_handlers
    stats.workers = workers

    allowed_routes = ['general', 'workers', 'config']
    unless req.params.sub in allowed_routes
      req.params.sub = 'general'

    get_worker_states = req.params.sub == "workers"

    # Fetch the stats and when we have 'em, show.
    stats.get get_worker_states, ->
      res.render("#{req.params.sub}.jade", stats: stats, sub: req.params.sub)

  app.listen(port)

  logger.info "phear", "Phear started."

# Request handler
handle_request = (req, res) ->
  thread_number = next_thread_number()

  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")

  # In all environments except development, check the IPs and only allow pre-defined addresses.
  # We do this both here and in the worker to prevent not-allowed IPs to bypass this and make
  # requests directly to the worker.
  if mode != "development" and not ip_allowed(req.headers["real-ip"])
    res.statusCode = 403
    return close_response("phear-#{thread_number}", "Forbidden.", res)

  # Check if the necessary params are set and aren't empty
  if not req.query.fetch_url?
    res.statusCode = 400
    return close_response("phear-#{thread_number}", "No URL requested, you have to set fetch_url=encoded_url.", res)

  # Check headers for validity if set
  if req.query.headers?
    try
      JSON.parse(req.query.headers)
    catch
      res.statusCode = 400
      return close_response("phear-#{thread_number}", "Additional headers not properly formatted, e.g.: encodeURIComponent('{extra: \"Yes.\"}').", res)

  # Response with JSON/raw results
  respond = (statusCode, body) ->
    if req.query.raw in ["true", "1"]
      parsed_body = JSON.parse(body)
      res.status(statusCode).send(parsed_body.content)
    else
      res.set "content-type", "application/json"
      res.status(statusCode).send(body)

    res.end()
    stats.requests.ok += 1
    active_request_handlers -= 1

  active_request_handlers += 1
  cache_namespace = "global-"

  if req.query.cache_namespace?
    cache_namespace = req.query.cache_namespace

  cache_key = "#{cache_namespace}#{req.query.fetch_url}"

  # Where the magic happens.
  memcached.get cache_key, (error, data) ->

    # Check if we can and should fetch, or serve from cache
    if error? or not data? or req.query.force in ["true", "1"]
      do_with_random_worker thread_number, (worker) ->

        # Make the URL for the worker
        worker_request_url = url.format {
          protocol: "http"
          hostname: "localhost"
          port: worker.port
          query: req.query
        }

        options = {url: worker_request_url, headers: {'real-ip': req.headers['real-ip']}, timeout: config.global_timeout}

        # Make the request to the worker and store in cache if status is 200 (don't store bad requests)
        request options, (error, response, body) ->
          try
            if response.statusCode == 200
              memcached.set cache_key, body, config.cache_ttl, ->
                logger.info "phear-#{thread_number}", "Stored #{req.query.fetch_url} in cache"

            # Return to requester!
            respond(response.statusCode, body)
          catch err
            res.statusCode = 500
            close_response("phear-#{thread_number}", "Request failed due to an internal server error.", res)

            if worker.process.status not in ["stopping", "stopped"]
              logger.info "phear-#{thread_number}", "Trying to restart worker with PID #{worker.process.pid}..."
              worker.process.stop(->
                if worker.process.status == "stopped"
                  worker.process.start()
                  logger.info "phear-#{thread_number}", "Restarted worker with PID #{worker.process.pid}."
              )
            else
              logger.info "phear-#{thread_number}", "Worker with PID #{worker.process.pid} is being restarted..."

            active_request_handlers -= 1

    else
      logger.info "phear-#{thread_number}", "Serving entry from cache."
      respond(200, data)

# Fetch a random running worker
do_with_random_worker = (thread_number, callback) ->
  running_workers = get_running_workers()

  if running_workers.length > 0
    callback running_workers[Math.floor(Math.random()*running_workers.length)]
  else
    logger.info "phear-#{thread_number}", "No running workers, waiting for a new worker to come up."
    setTimeout (-> do_with_random_worker(thread_number, callback)), 500

get_running_workers = ->
  (worker for worker in workers when worker.process.status is "running")

# Prettily close a response
close_response = (inst, status, response, refused=false) ->
  response.set "content-type", "application/json"

  logger.info inst, "Ending process."
  if [400, 403, 500, 503].indexOf(response.statusCode) > -1
    response.status(response.statusCode).send JSON.stringify(
      success: false
      reason: status
    )
  response.end()

  if refused
    stats.requests.refuse += 1
  else
    stats.requests.fail += 1

  logger.info inst, "Ended process with status #{status.toUpperCase()}."

# Count the number of request handler threads
next_thread_number = ->
  mommy.handler_thread_number = if mommy.handler_thread_number > 10000 then 1 else mommy.handler_thread_number + 1

ip_allowed = (ip) ->
  config.worker.allowed_clients.indexOf(ip) isnt -1

stop = ->
  logger.info "phear", "Trying to kill process and #{workers.length} workers gently..."

  tree_kill process.pid, 'SIGTERM', ->
    logger.info "phear", "Trying to kill process and workers forcefully..."
    tree_kill process.pid, 'SIGKILL'

# Initialization
# -----------------

# 3rd-party libs
basic_auth = require('basic-auth')
express = require('express')
Memcached = require('memcached')
package_definition = require('./package.json')
request = require('request')
respawn = require('respawn')
tree_kill = require('tree-kill');
url = require('url')

argv = require('yargs')
    .usage('Parse dynamic webpages.\nUsage: $0')
    .example('$0 -c', 'location of phear configuration file')
    .alias('c', 'config')
    .example('$0 -e', 'environment to run in.')
    .alias('e', 'environment')
    .default({c: "./config/config.json", e: "development"})
    .argv

# My libs
Logger = require("./lib/logger.js")
Config = require("./lib/config.js")
Stats = require("./lib/stats.js")

# Set the mode depending on environment
mode = argv.e

# Parse configuration for environment
config = new Config(argv.c, mode).config
config.worker.environment = mode

# Instantiate stuff
logger = new Logger(config, config.base_port)
workers = new Array(config.workers)

memcached_options = config.memcached.options
memcached_options.poolSize = config.workers * 10
memcached = new Memcached(config.memcached.servers, memcached_options)

# Make sure workers die on memcached errors.
memcached.on 'issue', (f) ->
  logger.info "phear", "Memcache failed: #{f.messages}"
  stop()

# Just check that Memcache is running by looking at stats, before promising you nice stuff.
memcached.stats((_)->true)

# Make sure that when the process is stopped due to an exception
# the PhantomJS processes also stop.
process.on 'uncaughtException', (err) ->
  logger.error "phear", "UNCAUGHT ERROR: #{err.stack}"
  stop()

logger.info "phear", "Starting Phear..."
logger.info "phear", "=================================="
logger.info "phear", "Version: #{package_definition.version}"
logger.info "phear", "Mode: #{mode}"
logger.info "phear", "Config file: #{argv.c}"
logger.info "phear", "Port: #{config.base_port}"
logger.info "phear", "Workers: #{config.workers}"
logger.info "phear", "=================================="

# Ssshhhh
mommy = this
mommy.handler_thread_number = 0

# Count the number of active request handlers to prevent failures due to overloading.
active_request_handlers = 0

stats = new Stats
  general:
    mode: mode,
    version: package_definition.version,
    config_file: argv.c,
    port: config.base_port
  config: config

# Actually start the service!
spawn(config.workers)
serve(config.base_port)
