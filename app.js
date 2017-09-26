var express = require("express"),
    https = require("https"),
    util = require("util"),
    app = express();
var request = require('request');
var f1 = require('./apiData.js');
fs = require('fs');

    var port = process.env.PORT || 3006;



app.get("/api/health/elastic", function(request, response) {
    var client = require('./connection.js');

    client.cluster.health({}, function(err, resp, status) {
        response.send(resp);
    });
});

app.get("/api/data", function(request, response) {

    console.log('request goes to ibm: ' + request.query)
    f1.getDataFromIBM(request, (err, body) => {
        //console.log(err);
        if (err) {
            console.log(err);
            response.status(500).send({
                error: err
            });

        } else {
            response.status(200).send(body);
            fs.appendFileSync('apim.log', JSON.stringify(body) + "/r/n/");
        }
        response.end();
    });


});

app.listen(port);
console.log("Listening on port ", port);
