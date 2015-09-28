(function() {
  var Logger, strftime;

  strftime = require('strftime');

  Logger = (function() {
    function Logger(config, port) {
      this.config = config;
      this.port = port;
    }

    Logger.prototype.info = function(this_inst, message) {
      var id;
      id = this.space_pad_id(this_inst, 20);
      return console.log((this.date_string()) + " [" + id + "] " + message);
    };

    Logger.prototype.error = function(this_inst, message) {
      var id;
      id = this.space_pad_id(this_inst, 20);
      return console.error("\x1b[1m\x1b[31m" + (this.date_string()) + " [" + id + "] " + message + "\x1b[0m");
    };

    Logger.prototype.date_string = function() {
      return strftime("%Y-%m-%d %H:%M:%S");
    };

    Logger.prototype.space_pad_id = function(id, length) {
      id = id + ":" + this.port;
      while (id.length < length) {
        id = " " + id;
      }
      return id;
    };

    return Logger;

  })();

  module.exports = Logger;

}).call(this);
