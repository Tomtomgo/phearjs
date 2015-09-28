(function() {
  var Stats, dot, strftime, usage;

  dot = require('dot-object');

  strftime = require('strftime');

  usage = require('usage');

  Stats = (function() {
    function Stats(options) {
      var ref, ref1, ref2, ref3;
      this.requests = {
        active: 0,
        fail: 0,
        ok: 0,
        refuse: 0,
        total: 0
      };
      this.general = {
        start_datetime: strftime("%Y-%m-%d %H:%M:%S (%z)"),
        mode: (options != null ? (ref = options.general) != null ? ref.mode : void 0 : void 0) || void 0,
        version: (options != null ? (ref1 = options.general) != null ? ref1.version : void 0 : void 0) || void 0,
        config_file: (options != null ? (ref2 = options.general) != null ? ref2.config_file : void 0 : void 0) || void 0,
        port: (options != null ? (ref3 = options.general) != null ? ref3.port : void 0 : void 0) || void 0
      };
      if (options.config != null) {
        this.config = dot.dot(options.config);
        if (this.config['status_page.pass'] != null) {
          this.config['status_page.pass'] = "************";
        }
      } else {
        this.config = void 0;
      }
      this.workers = {};
    }

    Stats.prototype.get = function(get_worker_states, callback) {
      var i, j, len, lookups_to_complete, ref, results, worker;
      this.requests.total = this.requests.ok + this.requests.fail + this.requests.refuse;
      lookups_to_complete = this.workers.length;
      if (get_worker_states) {
        ref = this.workers;
        results = [];
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
          worker = ref[i];
          results.push(((function(_this) {
            return function(worker, i) {
              return usage.lookup(worker.process.pid, function(err, res) {
                lookups_to_complete -= 1;
                if (err) {
                  _this.workers[i].usage = {
                    memory: void 0,
                    cpu: void 0
                  };
                } else {
                  _this.workers[i].usage = {
                    memory: Math.round(100 * res.memoryInfo.rss / 1024 / 1024) / 100,
                    cpu: Math.round(100 * res.cpu) / 100
                  };
                }
                if (lookups_to_complete <= 0) {
                  return callback();
                }
              });
            };
          })(this))(worker, i));
        }
        return results;
      } else {
        return callback();
      }
    };

    return Stats;

  })();

  module.exports = Stats;

}).call(this);
