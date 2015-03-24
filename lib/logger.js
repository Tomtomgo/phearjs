(function() {
  var Logger, strftime;

  strftime = require('strftime');

  Logger = (function() {
    function Logger(config, port) {
      this.config = config;
      this.port = port;
    }

    Logger.prototype.info = function(this_inst, message) {
      var date_string;
      date_string = strftime("%Y-%m-%d %H:%M:%S");
      return console.log(date_string + " [" + (this.space_pad_id(this_inst, 20)) + "] " + message);
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
