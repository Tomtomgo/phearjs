# Installation

- You need NodeJS, if you don't have it: [install NodeJS](http://nodejs.org/download/).
- You need PhantomJS 2 or higher, if you don't have it: [install PhantomJS](http://phantomjs.org/download.html).
- You need Memcached, if you don't have it: [install Memcached](https://code.google.com/p/memcached/wiki/NewInstallFromPackage).
- Then install PhearJS:

```bash
git clone git@github.com:Tomtomgo/phearjs.git
cd phearjs
npm install
```

Boom yer done! You can verify that PhearJS is running:

```bash
node phearjs
```

Then open [http://localhost:8100/status](http://localhost:8100/status) in your browser. It
should show some numbers.

# Running

Phear.js accepts these command-line arguments:

- **-c/--config**: location of phear configuration file
  Default: *./config/config.json*.
- **-e/--environment**: environment to run in.
  Default: *development*.

## Development

```bash
node phear.js
```

## Production

If you want to set up PhearJS as a service you might want to run it with [supervisord](http://supervisord.org/) and serve it via [Nginx](http://nginx.org/). This is a simple example of how to do that.

Note that in production mode:

* You should add a header to request from Nginx (or Apache) to `real-ip` which contains
the requester's IP. If you don't do that it's impossible to find out if the requester's IP
is allowed.

* The status page should be enabled through `config.json` and is password-protected with
Basic Auth. Mind you that if this is enabled, you should use HTTPS. Sending passwords over
plain HTTP is dangerous.

Example configurations:

**supervisord**:

``` conf
[group:phears]
programs=phear

[program:phear]
process_name="%(program_name)s"
command=node phear.js -e production
autorestart=true
redirect_stderr=true
stdout_logfile_maxbytes=500MB
stdout_logfile_backups=50
stdout_capture_maxbytes=1MB
stdout_events_enabled=false
loglevel=warn
```

**nginx**:

``` conf
user www-data;
worker_processes 1;
pid /var/run/nginx.pid;

events {
  worker_connections 200;
  multi_accept on;
}

http {
  sendfile on;
  tcp_nopush on;
  tcp_nodelay on;
  keepalive_timeout 65;
  types_hash_max_size 2048;

  # Mime types
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  # Logging
  access_log /var/log/nginx/access.log;
  error_log /var/log/nginx/error.log;

  # Gzip Settings
  gzip on;

  server {
    listen 80;
    root <YOUR_PHEAR_DIR>;

    location / {
      proxy_pass        http://0.0.0.0:8100;
      proxy_set_header  real-ip  $remote_addr; # Forward requester's IP.
    }
  }
}
```
