
var rqs = 0;
var fs = require('fs');
var request = require('request')

var urls = []

fs.readFile('../urlstest', 'utf8', function(err, data){
  console.log(data)
  urls = data.split("\n");
  setInterval(fetch, 50);
});

function fetch(){
  var url = urls[Math.floor(Math.random()*urls.length)];
  request({url: "http://localhost:8100?force=true&fetch_url="+encodeURIComponent(url)}, function(error, response, body){
    console.log(response.statusCode, url);
  });
}