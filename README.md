# PhearJS

PhearJS is a service that parses and evaluates (dynamic) webpages. It runs a server which supervises a set number of PhantomJS workers that do the actual parsing and evaluation.

Many websites rely on AJAX and front-end rendering. When a *machine* requests a page from such a website it gets a completely different page than you would when viewing it in a browser. 

This is a problem when you want to scrape such a website or create a static copy of your dynamic site for SEO purposes. PhearJS helps you with this, by rendering pages in a headless [PhantomJS](http://phantomjs.org/) browser and returning a JSON containing the rendered page and meta data about the response:

``` json
{
  "success": true,
  "input_url": "http://such-website.com",
  "final_url": "http://www.such-website.com/",
  "request_headers": {},
  "response_headers": {
    "date": "Sun, 08 Feb 2015 15:11:22 GMT",
    "content-encoding": "gzip",
    "expires": "Sun, 08 Feb 2015 15:12:33 GMT",
    "vary": "Accept-Encoding",
    "cache-control": "max-age=60",
    "last-modified": "Sun, 08 Feb 2015 15:11:33 GMT",
    "content-type": "text/html; charset=utf-8",
  },
  "had_js_errors": false,
  "content": "<rendered HTML>"
}
```

PhearJS was built and tested on Ubuntu 14.04, but should work on most Linux distributions. OSX reportedly works fine as well, though the installation instructions don't apply here. Proper installation instructions for OSX are [very welcome](#contributing).

# Usage

Requests can be made to http://localhost:8100?fetch_url=http%3A%2F%2Fdomain.com in development mode or http://<PHEAR_IP>:<PHEAR_PORT>?fetch_url=http%3A%2F%2Fdomain.com in production mode.

PhearJS accepts the following parameters:

- **fetch_url**=<*url-encoded-string*\> ***required***
  The URL to fetch, encoded as it would be by e.g. encodeURIComponent().

- **parse_delay**=<*milliseconds*\>
  Amount of milliseconds to wait (allow scripts to run) before returning.
  Default: *as set in config.json*.

- **force**=[*true*|*1*]
  Force a cache refresh.
  Default: *false*.

- **raw**=[*true*|*1*]
  Return the raw body instead of a JSON.
  Default: *false*.

- **headers**=*URL-encoded JSON*
  Add additional headers to the request.
  Default: *{}*.

- **cache_namespace**=*string*
  A namespace to use on the cache. Can be useful for multi-client settings.
  Default: *global-*.

# Installation, set-up and running

Check out [these instructions](INSTALLATION.md).

# Contributing

Contributions are always welcome!

Currently what would be great to have:

- Verifying OSX install instructions
- Automated tests

In any case make sure:

1. Open an issue in this repository.
2. Fork the project.
3. Fix or create.
4. Update these docs if applicable.
5. Make a pull request referencing the issue.

# Credits

This project was initiated at [Shuffler.fm](http://shuffler.fm) and continued at [Achieved.co](http://achieved.co).

# License

PhearJS is copyright 2014-2015 Tom Aizenberg, Marcel Gonzalez Corso.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL TOM AIZENBERG BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.