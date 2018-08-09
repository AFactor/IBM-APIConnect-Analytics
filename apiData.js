var request = require('request');
var config = require('./config.json');
var util = require("util");
var f = module.exports = {};
var async = require("async");
var Enumerable = require("linq")
var dateFormat = require('dateformat');
var config = require('./config.json');
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
	
    var startTimeFileName = dateFormat(startTime, "ddmmyyyyhhMMssTT");
    var endTimeFileName = dateFormat(endTime, "ddmmyyyyhhMMssTT");

    var encodedCredentials = config[environment].auth, 
        baseUrl = config[environment].baseUrl,
        pathFormat = config[environment].path,
        limit = config.limit,
        org = config[environment].org,
        catalog = config[environment].catalog,
        fields = config.fields;
    
    
    //files

    let successFile =util.format(config.success_temp_log, startTimeFileName,endTimeFileName );
    let errorFile =util.format(config.error_temp_log, startTimeFileName,endTimeFileName);

    var path = util.format(pathFormat, org, catalog, endTime, startTime, limit, fields);
    var url = baseUrl + path; //;
    
   

    var getHeaders = {
        'Content-Type' : 'application/json',
        'authorization' : encodedCredentials
    };

    
    var calls = {"totalCalls":0,"next":"","nextHref": url,"calls":[]};
    var count = 1;
    var errorHeader=false;
    var total = 1;
    var success =[];
    var error=[];
    let writeErrrorStream = fs.createWriteStream(errorFile);
    let writeSuccessStream = fs.createWriteStream(successFile);
    async.whilst(
        function() { return count <= total; },
        function(nextCall) {
            console.log('This Url: ' + calls.nextHref);
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
                    console.log('Iteration No ' + count);
                    var thisCall = JSON.parse(body);
                    if(calls.totalCalls==0){
                        calls.totalCalls = thisCall.totalCalls;
                        console.log('Total Call to pull: ' + calls.totalCalls);
                        total = Math.ceil(calls.totalCalls/limit);
                        console.log('Estimated iteration: ' + total);
                    }
                    calls.nextHref = thisCall.nextHref;
                    let thisError= thisCall.calls.filter(element => (element.statusCode.startsWith('4') || element.statusCode.startsWith('5')));
                    if(thisError.length>0){
                        if(!errorHeader){
                            errorHeader = true;
                            writeErrrorStream.write(Object.keys(thisError[0]).join('|')+ '\n');
                        }
                        writeErrrorStream.write(thisError.map(e => Object.values(e).join('|')).join('\n'));
                        //errors.push(thisError);
                    }
                    thisSuccess= thisCall.calls.filter(element => element.statusCode.startsWith('2'));
                    if(thisSuccess.length>0){
                        thisSuccess.forEach(s => {
                            success.push( s.apiName + '|' + s.statusCode + '|' + s.requestMethod  );
                        });
                        
                    }
                    
        
                    count++;
                    nextCall();
                                
        
                }); 

            },
            function (er, n) {
                if(er){
                    return ibmCallback({'start' : startTime, 'end' : endTime, 'error' : er, 'status' : '500'}, null);
                }else{
                    
                    writeErrrorStream.on('finish', () => {  
                        console.log('wrote all error data to file');
                    });
                    
                    // close the stream
                    writeErrrorStream.end();  
                    // summary success
                   
                    console.log('Final Iteration: ' + (count -1));
                    return ibmCallback(null, {'start' : startTime, 'end' : endTime , 'total' : calls.totalCalls, 'status' : 'y', 'successes': success, 'errors': 'n/a'});
                }
            }
);
 
};



