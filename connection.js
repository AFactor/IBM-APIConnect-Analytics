var elasticsearch=require('elasticsearch');
var config = require('./config.json');

var client = new elasticsearch.Client( {  
  hosts: [ config.elasticUrl]
});

module.exports = client;  
