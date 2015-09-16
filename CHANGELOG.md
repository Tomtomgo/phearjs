# Changelog

### 0.3.1

Added version information on startup
Workaround for [memory leak in QT](https://bugreports.qt.io/browse/QTBUG-38857) ([relevant PhantomJS issue](https://github.com/ariya/phantomjs/issues/12903))

### 0.3.0

Added connection limiter to prevent failure due to overloading
Improved/fixed header passing to workers
Improved response on server error

### 0.2.0

Added memcached pool
Added thread count for request handler
Code cleanup (whitespace/comments)
Fix query string parameter handling for raw/force
Improved error handling for crashed workers
Improved package.json
Improved process tree killing
Improved random worker selection

### 0.1.0 (01-03-2015)

First release