#
# config
# -------------
#
# Parses a config file.
#

fs = require("fs")

class Config
  constructor: (path, environment) ->
    @config = JSON.parse(fs.readFileSync(path))[0][environment]

module.exports = Config