(function() {
  var Config, fs;

  fs = require("fs");

  Config = (function() {
    function Config(path, environment) {
      this.config = JSON.parse(fs.readFileSync(path))[0][environment];
    }

    return Config;

  })();

  module.exports = Config;

}).call(this);
