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
    date_string = strftime("%Y-%m-%d %H:%M:%S")
    console.log "#{date_string} [#{@space_pad_id(this_inst, 20)}] #{message}"
    
  space_pad_id: (id, length) ->
    id = "#{id}:#{@port}"
    id = " " + id while id.length < length
    id

module.exports = Logger