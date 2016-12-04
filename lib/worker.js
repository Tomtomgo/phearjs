(function() {
  var Logger, close_response, config, fetch_url, ip_allowed, jar, logger, mommy, next_instance_number, page, parse_config, run_server, strip_scripts, system, url, webserver;

  run_server = function() {
    var server, service;
    server = webserver.create();
    service = server.listen(config.port, function(request, response) {
      var as_image, as_image_config, err, escaped_fetch_url, get_cookies, get_requests, parse_delay, parsed_fetch_url, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, request_headers, request_url, this_inst, viewport_height, viewport_width;
      this_inst = next_instance_number();
      this_inst = "worker:p-" + this_inst;
      logger.info(this_inst, "Spawn subprocess.");
      if (request.headers["real-ip"] != null) {
        logger.info(this_inst, "Request origin: " + request.headers['real-ip']);
      }
      if (config.environment !== "development" && !ip_allowed(request.headers["real-ip"])) {
        response.statusCode = 403;
        return close_response(this_inst, "Forbidden.", response);
      }
      request_url = url.parse(request.url, true);
      if ((((ref = request_url.query) != null ? ref.fetch_url : void 0) == null) || !request_url.query.fetch_url) {
        response.statusCode = 400;
        return close_response(this_inst, "No URL requested.", response);
      }
      escaped_fetch_url = decodeURIComponent(request_url.query.fetch_url);
      parsed_fetch_url = url.parse(escaped_fetch_url);
      if (!("protocol" in parsed_fetch_url && ["http:", "https:"].indexOf(parsed_fetch_url.protocol) > -1)) {
        response.statusCode = 400;
        return close_response(this_inst, "Requested URL has a non-supported protocol, use http or https.", response);
      }
      parse_delay = ((ref1 = request_url.query) != null ? ref1.parse_delay : void 0) || config.parse_delay;
      get_requests = ((ref2 = request_url.query) != null ? ref2.get_requests : void 0) || config.get_requests;
      get_cookies = ((ref3 = request_url.query) != null ? ref3.get_cookies : void 0) || config.get_cookies;
      as_image = ((ref4 = (ref5 = request_url.query) != null ? ref5.as_image : void 0) === "true" || ref4 === "1") || config.as_image;
      as_image_config = config.as_image_config;
      viewport_width = ((ref6 = request_url.query) != null ? ref6.viewport_width : void 0) || config.viewport_width;
      viewport_height = ((ref7 = request_url.query) != null ? ref7.viewport_height : void 0) || config.viewport_height;
      request_headers = {};
      if (request_url.query.headers != null) {
        try {
          request_headers = JSON.parse(request_url.query.headers);
        } catch (error) {
          response.statusCode = 400;
          return close_response(this_inst, "Malformed request headers.", response);
        }
      }
      logger.info(this_inst, "Fetching " + escaped_fetch_url + ".");
      try {
        return fetch_url(escaped_fetch_url, response, this_inst, parse_delay, request_headers, get_requests, get_cookies, as_image, as_image_config, viewport_width, viewport_height);
      } catch (error) {
        err = error;
        response.statusCode = 500;
        return close_response(this_inst, "Error on fetching.", response);
      }
    });
    if (service) {
      return logger.info("worker", "Running PhantomJS worker.");
    }
  };

  fetch_url = function(url, response, this_inst, parse_delay, request_headers, get_requests, get_cookies, as_image, as_image_config, viewport_width, viewport_height) {
    var cookie_inst, done, final_url, had_js_errors, headers, page_inst, requests;
    final_url = url;
    headers = {};
    requests = [];
    had_js_errors = false;
    done = false;
    page_inst = page.create();
    page_inst.settings.userAgent = config.user_agent;
    page_inst.settings.resourceTimeout = config.timeout;
    page_inst.customHeaders = request_headers;
    cookie_inst = jar.create();
    page_inst.cookieJar = cookie_inst;
    page_inst.onUrlChanged = function(targetUrl) {
      logger.info(this_inst, "Redirected to " + targetUrl);
      return final_url = targetUrl;
    };
    page_inst.onResourceReceived = function(response) {
      var decoded_url;
      decoded_url = decodeURIComponent(response.url);
      if (decoded_url === final_url && response.stage === "end") {
        return headers[decoded_url] = response.headers;
      }
    };
    if (get_requests === "true" || get_requests === "1") {
      page_inst.onResourceRequested = function(request) {
        return requests.push(request);
      };
    }
    page_inst.onResourceTimeout = function(response) {
      return logger.info(this_inst, "ResourceTimeout on " + url);
    };
    page_inst.onResourceError = function(msg, trace) {
      if (msg.url != null) {
        logger.info(this_inst, "ResourceError on " + url + ": " + msg.errorString + " (" + msg.url + ")");
        if (msg.url === final_url) {
          if (page_inst.parse_wait != null) {
            clearTimeout(page_inst.parse_wait);
          }
          response.statusCode = 500;
          page_inst.close();
          cookie_inst.close();
          return close_response(this_inst, "Failed to fetch this URL: " + msg.errorString, response);
        }
      } else {
        return logger.info(this_inst, "ResourceError on " + url + ": " + msg.errorString);
      }
    };
    page_inst.onError = function(msg, trace) {
      if (msg.url != null) {
        logger.info(this_inst, "JavaScriptError on " + url + ": " + msg.errorString + " (" + msg.url + ")");
      } else {
        logger.info(this_inst, "JavaScriptError on " + url + ": " + msg.errorString);
      }
      return had_js_errors = true;
    };
    return page_inst.open(url, function(status) {
      var fetch_url_headers, i;
      if (done) {
        return true;
      } else {
        done = true;
      }
      if (status !== "success") {
        logger.info(this_inst, "Failed " + url);
        response.statusCode = 500;
        close_response(this_inst, "Failed to fetch this URL.", response);
        page_inst.close();
        return cookie_inst.close();
      } else {
        logger.info(this_inst, "Fetched " + url + " parsing with a parse_delay of " + parse_delay + " ms.");
        fetch_url_headers = {};
        for (i in headers[final_url]) {
          fetch_url_headers[headers[final_url][i]["name"].toLowerCase()] = headers[final_url][i]["value"];
        }
        response.setHeader("content-type", "application/json");
        return page_inst.parse_wait = setTimeout((function() {
          var iso_date, path_to_image;
          if (!(page_inst != null ? page_inst.hasOwnProperty('content') : void 0)) {
            response.statusCode = 500;
            close_response(this_inst, "Rendering " + url + " failed.", response);
            if (page_inst != null) {
              logger.info(this_inst, "Closed page instance.");
              page_inst.close();
              cookie_inst.close();
            }
            return;
          }
          if (as_image) {
            page_inst.viewportSize = {
              width: viewport_width,
              height: viewport_height
            };
            iso_date = new Date().toISOString();
            if (as_image_config.base64) {
              base64_image = page_inst.renderBase64(as_image_config.format);
            }else{
              path_to_image = "" + as_image_config.path + (iso_date.substr(0, 10)) + "/" + (iso_date.substr(11, 12)) + " - " + (Math.random().toString(36).substring(2, 7)) + "." + as_image_config.format;
              page_inst.render(path_to_image, {
                format: as_image_config.format,
                quality: as_image_config.quality
              });
            }
          }
          response.statusCode = 200;
          response.write(JSON.stringify({
            success: true,
            input_url: url,
            final_url: final_url,
            request_headers: request_headers,
            response_headers: fetch_url_headers,
            requests: get_requests === "true" || get_requests === "1" ? requests : void 0,
            cookies: get_cookies === "true" || get_cookies === "1" ? cookie_inst.cookies : void 0,
            had_js_errors: had_js_errors,
            content: strip_scripts(page_inst.content),
            rendered: as_image ? as_image_config.base64 ? base64_image : path_to_image : void 0
          }));
          close_response(this_inst, status, response);
          page_inst.close();
          cookie_inst.close();
        }), parse_delay);
      }
    });
  };

  close_response = function(inst, status, response) {
    logger.info(inst, "Ending subprocess.");
    if ([400, 403, 500].indexOf(response.statusCode) > -1) {
      response.write(JSON.stringify({
        success: false,
        reason: status
      }));
    }
    response.close();
    return logger.info(inst, "Ended subprocess with status " + status.toUpperCase() + ".");
  };

  strip_scripts = function(doc) {
    return doc.replace(/<script(?:.*?)>(?:[\S\s]*?)<\/script>/gi, "");
  };

  next_instance_number = function() {
    return mommy.spawned_instances = mommy.spawned_instances > 10000 ? 1 : mommy.spawned_instances + 1;
  };

  ip_allowed = function(ip) {
    return config.allowed_clients.indexOf(ip) !== -1;
  };

  parse_config = function() {
    var config;
    config = new RegExp(/--config=(.*)/).exec(system.args);
    return JSON.parse(config[1]);
  };

  page = require("webpage");

  webserver = require("webserver");

  system = require("system");

  url = require("url");

  jar = require("cookiejar");

  Logger = require("./logger.js");

  config = parse_config();

  logger = new Logger(config, config.port);

  mommy = this;

  mommy.spawned_instances = 0;

  run_server();

}).call(this);
