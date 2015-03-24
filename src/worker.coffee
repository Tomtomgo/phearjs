#
#  Worker.js
#  -------------------
#  A worker that runs in PhantomJS and listens on a specified port. 
#  When a request is made it fetches and parses the requested URL.
#

# go! go! go!
run_server = ->
  
  # Create the server
  server = webserver.create()
  
  # Listen for requests!
  service = server.listen config.port, (request, response) ->
    
    # Count the number of spawned page instances
    this_inst = next_instance_number()
    this_inst = "worker:p-#{this_inst}"

    logger.info this_inst, "Spawn subprocess."
    logger.info this_inst, "Request origin: #{request.headers['real-ip']}" if request.headers["real-ip"]?
    
    # In all environments except development, check the IPs and only allow pre-defined addresses
    if config.environment != "development" and not ip_allowed(request.headers["real-ip"])
      response.statusCode = 403
      return close_response(this_inst, "Forbidden.", response)
    
    # Get the URL from the request
    request_url = url.parse(request.url, true)
    
    # Check if the necessary params exist and aren't empty
    if not request_url.query?.fetch_url? or not request_url.query.fetch_url
      response.statusCode = 400
      return close_response(this_inst, "No URL requested.", response)

    # Parse the requested URL
    escaped_fetch_url = decodeURIComponent(request_url.query.fetch_url)
    parsed_fetch_url = url.parse(escaped_fetch_url)
    
    # Check that the requested URL's protocol is HTTP(S)
    unless "protocol" of parsed_fetch_url and ["http:", "https:"].indexOf(parsed_fetch_url.protocol) > -1
      response.statusCode = 400
      return close_response(this_inst, "Requested URL has a non-supported protocol, use http or https.", response)
    
    # Check for parse delay.
    parse_delay = request_url.query?.parse_delay or config.parse_delay

    # Parse optional headers
    request_headers = {}
    if request_url.query.headers?
      try
        request_headers = JSON.parse(request_url.query.headers)
      catch
        response.statusCode = 400
        return close_response(this_inst, "Malformed request headers.", response)
    
    logger.info this_inst, "Fetching #{escaped_fetch_url}."  
    
    try
      #Get the page
      fetch_url escaped_fetch_url, response, this_inst, parse_delay, request_headers
    catch err
      response.statusCode = 500
      return close_response(this_inst, "Error on fetching.", response)
  
  # Show that the worker has started
  logger.info "worker", "Running PhantomJS worker." if service

# Fetch and parse a page
fetch_url = (url, response, this_inst, parse_delay, request_headers) ->
  final_url = url # store a final URL for redirects
  headers = {} # store response headers
  had_js_errors = false # know if there were any JS errors
  
  # We keep the completion status, because callback is called twice by PhantomJS (?)
  done = false
  
  # Create the PhantomJS page instance
  page_inst = page.create()
  page_inst.settings.userAgent = config.user_agent
  page_inst.settings.resourceTimeout = config.timeout
  page_inst.customHeaders = request_headers

  # Create page instance callbacks

  # Remember what the actual URL is we are served.
  page_inst.onUrlChanged = (targetUrl) ->
    logger.info this_inst, "Redirected to #{targetUrl}"
    final_url = targetUrl

  # Remember the headers at the end of the request. For everything that is 
  # received this callback is triggered, so only store if the URL is final.
  page_inst.onResourceReceived = (response) ->
    decoded_url = decodeURIComponent(response.url)
    headers[decoded_url] = response.headers if decoded_url is final_url and response.stage is "end"

  # When the resource times out an error is thrown
  page_inst.onResourceTimeout = (response) ->
    logger.info this_inst, "ResourceTimeout on #{url}"

  # Handle failed requests
  page_inst.onResourceError = (msg, trace) ->
    if msg.url?
      logger.info this_inst, "ResourceError on #{url}: #{msg.errorString} (#{msg.url})"

      # Don't bother contuing if we already failed.
      if msg.url == final_url
        clearTimeout(page_inst.parse_wait) if page_inst.parse_wait?
        response.statusCode = 500
        page_inst.close()
        return close_response this_inst, "Failed to fetch this URL: #{msg.errorString}", response
    else
      logger.info this_inst, "ResourceError on #{url}: #{msg.errorString}"
  
  page_inst.onError = (msg, trace) ->
    if msg.url?
      logger.info this_inst, "JavaScriptError on #{url}: #{msg.errorString} (#{msg.url})"
    else
      logger.info this_inst, "JavaScriptError on #{url}: #{msg.errorString}"

    had_js_errors = true
  
  # Create an instance of PhantomJS's webpage (the actual fetching and parsing happens here)
  page_inst.open url, (status) ->
    
    # Prevent double execution
    if done then return true else done = true
    
    # On success, parse & evaluate the page, otherwise don't bother and return the error.
    unless status is "success"
      logger.info this_inst, "Failed " + url
      response.statusCode = 500
      close_response this_inst, "Failed to fetch this URL.", response
      page_inst.close()
    else
      logger.info this_inst, "Fetched #{url} parsing with a parse_delay of #{parse_delay} ms."
      response.statusCode = 200
      fetch_url_headers = {}
      
      # Add the headers to the response!
      for i of headers[final_url]
        
        # We make the keys lowercase, HTTP header keys are case-insensitive. (http://stackoverflow.com/questions/5258977/are-http-headers-case-sensitive)
        fetch_url_headers[headers[final_url][i]["name"].toLowerCase()] = headers[final_url][i]["value"]
      
      response.setHeader "content-type", "application/json"
      
      # The page was requested, now we give PhantomJS parse_delay milliseconds to evaluate the page
      page_inst.parse_wait = setTimeout (->
        response.write JSON.stringify(
          success: true
          input_url: url
          final_url: final_url
          request_headers: request_headers
          response_headers: fetch_url_headers
          had_js_errors: had_js_errors
          content: strip_scripts(page_inst.content)
        )
        close_response this_inst, status, response
        page_inst.close()
        return
      ), parse_delay

# prettily close a response.
close_response = (inst, status, response) ->
  logger.info inst, "Ending process."
  if [400, 403, 500].indexOf(response.statusCode) > -1
    response.write JSON.stringify(
      success: false
      reason: status
    )
  response.close()
  logger.info inst, "Ended process with status " + status.toUpperCase() + "."

# Remove script tags from the page
strip_scripts = (doc) ->
  doc.replace(/<script(?:.*?)>(?:[\S\s]*?)<\/script>/gi, "")

# Count the number of spawned PhantomJS page instances
next_instance_number = ->
  mommy.spawned_instances = if mommy.spawned_instances > 10000 then 1 else mommy.spawned_instances + 1

ip_allowed = (ip) ->
  config.allowed_clients.indexOf(ip) isnt -1

# Parse config, it's a bit sketchy to do this with a regex, 
# but PhantomJS doesn't work with e.g. the yargs package.
# So, we just pass a JSON object, it's okay since this worker is
# only started by the .
parse_config = ->
  config = new RegExp(/--config=(.*)/).exec(system.args)
  JSON.parse(config[1])


# Initialization
# -----------------

# PhantomJS libs
page = require("webpage")
webserver = require("webserver")
system = require("system")
url = require("url")

# My libs
Logger = require("./logger.js")

# Parse config & start logger
config = parse_config()
logger = new Logger(config, config.port)

# Ssshhhh
mommy = this
mommy.spawned_instances = 0

# Go!
run_server()
