#
# logger
# -------------
# Logs stuff nicely for humans and machines.
#

strftime = require('strftime')

class Logger

  constructor: (config, port) ->
    @config = config
    @port = port

  info: (this_inst, message) ->
    id = @space_pad_id(this_inst, 20)
    console.log "#{@date_string()} [#{id}] #{message}"

  error: (this_inst, message) ->
    id = @space_pad_id(this_inst, 20)
    console.error "\x1b[1m\x1b[31m#{@date_string()} [#{id}] #{message}\x1b[0m"

  date_string: ->
    strftime("%Y-%m-%d %H:%M:%S")

  space_pad_id: (id, length) ->
    id = "#{id}:#{@port}"
    id = " " + id while id.length < length
    id

module.exports = Logger