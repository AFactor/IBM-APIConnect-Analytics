var express = require("express"),
    https = require("https"),
    util = require("util"),
    app = express();
    api = require("apic")
var request = require('request');
var f1 = require('./apiData.js');
fs = require('fs');

    var port = process.env.PORT || 2018;




app.get("/api/batch", function(request, response) {

    console.log('request goes to ibm: ' + request.query)
    
    response.status(200).send('hello');
     
    response.end();
    


});

app.listen(port);
console.log("Listening on port ", port);
