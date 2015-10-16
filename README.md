![PhearJS](http://d3jtdrwnfjguwh.cloudfront.net/logo-red.svg) (0.4.1)

PhearJS renders webpages. It runs a server which supervises a set number of PhantomJS workers that do the actual parsing and evaluation.

Many websites rely on AJAX and front-end rendering. When a *machine* requests a page from such a website it sees a completely different page than you would see when viewing it in a browser.

This is a problem when you want to scrape such a website or create a static copy of your dynamic site for data mining or SEO purposes. PhearJS helps you with this, by rendering pages in a headless [PhantomJS](http://phantomjs.org/) browser and returning a JSON containing the rendered page and meta data about the response.

PhearJS was built and tested on Ubuntu 15.04, but should work on most Linux distributions. OSX reportedly works fine as well.

For a hosted API of PhearJS check out [phear.io](http://phear.io).

## Example

### Request

```bash
curl -X GET "http://localhost:8100? \
  fetch_url=http%3A%2F%2Fsuch-website.com"
```

### Response

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

## Installation, set-up and running

Check out [these instructions](INSTALLATION.md).

## Usage

Requests can be made to:

`http://localhost:8100?fetch_url=http%3A%2F%2Fdomain.com`

PhearJS accepts the following parameters:

- **fetch_url**=<*url-encoded-string*\> ***required***
  The URL to fetch, encoded as it would be by e.g. encodeURIComponent().

- **parse_delay**=<*milliseconds*\>
  Time to wait before returning, allowing scripts and AJAX calls to run.
  Default: *as set in config.json*.

- **force**=[*false*|*true*]
  Force a cache refresh.
  Default: *false*.

- **raw**=[*false*|*true*]
  Return the raw body instead of a JSON.
  Default: *false*.

- **headers**=<*URL-encoded JSON*\>
  Add additional headers to the request.
  Default: *{}*.

- **cache_namespace**=<*string*\>
  A namespace to use on the cache. Can be useful for multi-client settings.
  Default: *global-*.

### Status page

When PhearJS is running you can find a status page at `http://localhost:8100/status`. It
shows some stats about the running process. In production this status page should be enabled
via `config.json` and is password-protected through Basic Auth.

## Related projects

* [phearjs-express](https://github.com/Tomtomgo/phearjs-express): An Express middleware to serve prerendered pages to bots and search engines.

## Issues

If any issues may occur, please create a GitHub issue. This will help using PhearJS. Even
better: contribute! (keep reading... ;))

## Contributing

Contributions are always welcome!

In any case make sure:

1. Open an issue in this repository.
2. Fork the project.
3. Do the codes.
4. Build with `gulp build`.
5. Update these docs if applicable.
6. Make a pull request referencing the issue.

## Credits

This project was initiated at [Shuffler.fm](http://shuffler.fm) and continued at [Achieved.co](http://achieved.co).

## License

PhearJS is copyright 2014-2015 Tom Aizenberg, Marcel Gonzalez Corso.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL TOM AIZENBERG BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
