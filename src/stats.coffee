#
# Stats
# ----------
# Handles stats about the Phear proces.
#

dot = require 'dot-object'
strftime = require 'strftime'
usage = require 'usage'

class Stats

  constructor: (options) ->
    @requests =
      active: 0,
      fail: 0,
      ok: 0,
      refuse: 0,
      total: 0

    @general =
      start_datetime: strftime("%Y-%m-%d %H:%M:%S (%z)"),
      mode: options?.general?.mode or undefined,
      version: options?.general?.version or undefined,
      config_file: options?.general?.config_file or undefined,
      port: options?.general?.port or undefined

    if options.config?
      @config = dot.dot options.config
      if @config['status_page.pass']?
        @config['status_page.pass'] = "************"
    else
      @config = undefined

    @workers = {}

  # Stats#get will fetch for each running worker the current system resource
  # usage. Because this lookup is async, we wait until all reports are fetched.
  # Then we can run the callback.
  get: (get_worker_states, callback) ->
    @requests.total = @requests.ok + @requests.fail + @requests.refuse

    lookups_to_complete = @workers.length

    # Don't bother looking up usage stats for nothing
    if get_worker_states
      for worker, i in @workers
        ((worker, i) =>
          usage.lookup worker.process.pid, (err, res) =>
            lookups_to_complete -= 1

            if err
              @workers[i].usage =
                memory: undefined
                cpu: undefined
            else
              @workers[i].usage =
                memory: Math.round(100 * res.memoryInfo.rss / 1024 / 1024) / 100
                cpu: Math.round(100 * res.cpu) / 100

            if lookups_to_complete <= 0
              callback()
        )(worker, i)
    else
      callback()

module.exports = Stats