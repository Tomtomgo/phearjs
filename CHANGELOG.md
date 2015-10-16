# Changelog

### 0.4.1 (16-10-2015)

Thanks to @falhashimi for amazing feedback on PhearJS in a production environment.

Catch persistent 100% CPU consumption by PhantomJS after continuous high load
Catch rare Qt garbage collection issue

### 0.4.0 (28-09-2015)

Added a status page
Fixed favicon
Improved docs

### 0.3.1 (16-09-2015)

Added version information on startup
Workaround for [memory leak in QT](https://bugreports.qt.io/browse/QTBUG-38857) ([relevant PhantomJS issue](https://github.com/ariya/phantomjs/issues/12903))

### 0.3.0 (03-09-2015)

Added connection limiter to prevent failure due to overloading
Improved/fixed header passing to workers
Improved response on server error

### 0.2.0 (26-08-2015)

Added memcached pool
Added thread count for request handler
Code cleanup (whitespace/comments)
Fix query string parameter handling for raw/force
Improved error handling for crashed workers
Improved package.json
Improved process tree killing
Improved random worker selection

### 0.1.0 (24-03-2015)

First release