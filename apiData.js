var request = require('request');
var config = require('./config.json');
var util = require("util");
var f = module.exports = {};
var async = require("async");
var Enumerable = require("linq")

var config = require('./config.json');
var client = require('./connection.js');  
var clc = require('cli-color');

f.getDataFromIBM = function (req, ibmCallback) { 
	// code goes here

	
    var startTime = req.query.startTime;
    var endTime = req.query.endTime;
    var environment = req.query.env;
	var config = require('./config.json');
    
	
	if(!endTime)
	{
        var end = new Date();
        endTime = end.toISOString();
        var start = end;
        start.setMinutes(end.getMinutes() -config.min);
        
		
        startTime = start.toISOString();
        
        console.log( 'Start: ' + startTime + ' End: ' + endTime);
	}
	
    

    var encodedCredentials = config[environment].auth, 
        baseUrl = config[environment].baseUrl,
        pathFormat = config[environment].path,
        limit = config[environment].limit,
        org = config[environment].org,
        catalog = config[environment].catalog,
        fields = config.fields;
    
    

    var path = util.format(pathFormat, org, catalog, endTime, startTime, limit, fields);
    var url = baseUrl + path; //;

    //console.log("url ", url);
    //console.log("path ", path);
    //console.log("encodedCredentials ", util.format('Basic %s', encodedCredentials));

    var getHeaders = {
        'Content-Type' : 'application/json',
        'authorization' : encodedCredentials
    };

    
    var calls = {"totalCalls":0,"next":"","nextHref": url,"calls":[]};
    var count = 1;
    var total = 1;
    

    async.whilst(
        function() { return count <= total; },
        function(callback) {
            console.log('This Url: ' + calls.nextHref);
            //console.log('proxy:'  + config.proxy);
            request.get({
                url: calls.nextHref,
                //proxy: config.proxy,
                headers: getHeaders,
                strictSSL: false
            }, (err, res, body) => {
                    if(err || (res.statusCode!=200))
                    {
                        err = 'IBM API is returning status ' + JSON.stringify(res) + '. Please raise a support ticket with IBM';
                        console.log('err: The program shall not run any more' + err );
                        return ibmCallback({'start' : startTime, 'end' : endTime, 'error' : err, 'status' : '500'}, null);
                    }
                    console.log('count ' + count);
                    console.log('body: '  + res.statusCode);
                    var thisCall = JSON.parse(body);
                    calls.totalCalls = thisCall.totalCalls;
                    console.log('Total Call to pull: ' + calls.totalCalls);

                    calls.nextHref = thisCall.nextHref;
                    console.log('Next Url: ' + calls.nextHref);
                    total = Math.ceil(calls.totalCalls/limit);
                    console.log('Total iteration: ' + total);
                    var bulkBody =[];
                    var push  = false;
                    thisCall.calls.forEach( function(element, index) {
                       
                                push = true;
                                bulkBody.push({ index:  { _index: 'apim', _type: 'detail'} }
                                 ,{
                                    "timestamp" : element.timestamp,
                                    "api" : element.apiName,
                                    "app" : element.appName,
                                    "plan" : element.planName,
                                    "org" : element.devOrgName,
                                    "timeToServeRequest" : element.timeToServeRequest,
                                    "uri" : element.uriPath,
                                    "statusCode" : element.statusCode,
                                    "clientIp" : element.clientGeoIp.ip,
                                    "country" : element.clientGeoIp.country_name,
                                    "location": { 
                                         "lat": element.clientGeoIp.latitude,
                                         "lon": element.clientGeoIp.longitude
                                        },
                                    "latency": element.latency
                                    });
                                
                                
                        
                    });
                    if(push){
                        return ibmCallback(null, bulkBody);
                    //     client.bulk({body: bulkBody},
                    //         function(err,resp,status) {
                    //             if(err){
                    //                 console.log(clc.red(status + '----' + err + " : " + JSON.stringify(bulkBody)));
				    // return ibmCallback({'start' : startTime, 'end' : endTime, 'error' : err, 'status' : 'n'}, null);
                    //             }
                    //             else{
                    //                console.log(clc.blue(thisCall.calls.length.toString()  + ' records added. Status: ' + status + ' in index apim'));
                    //             }
                    //         });
                    }
                    //count++;
                    //callback(null, count);
        
                }); 

            },
            function (err, n) {
                //console.log(calls);
                console.log('Total Iteration: ' + (count -1));
                return ibmCallback(null, {'start' : startTime, 'end' : endTime , 'total' : calls.totalCalls, 'status' : 'y'});
    }
);
    //---test end

    

    //return callback(calls);
	//return
};




