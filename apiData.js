var request = require('request');
var util = require("util");
var f = module.exports = {};
var async = require("async");
var dateFormat = require('dateformat');
var config = require('./config.json');
var fs = require("fs");

f.getDataFromIBM = function () { 
	// code goes here

    console.log(process.argv);
	
    var startTime = "";
    var endTime = "";
    var environment = process.argv[2];
	var config = require('./config.json');
    
	// set default time range if no end time is sent.
	if(!process.argv[4]) //end time
	{
        var end = new Date();
        endTime = end.toISOString();
        var start = end;
        start.setMinutes(end.getMinutes() -config.min);
        startTime = start.toISOString();
        console.log( 'Start: ' + startTime + ' End: ' + endTime);
	}else{
        endTime = process.argv[4];
        if(!process.argv[3]){
            console.log('Either pass the full time range or leave it empty for default');
            process.exit(-1);
        }else{
            startTime = process.argv[3];
        }
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

    let logFile = util.format(config.apim_log, dateFormat(new Date(), "ddmmyyyy"));
    
    let errorFile =util.format(config.error_temp_log, startTimeFileName,endTimeFileName);

    var path = util.format(pathFormat, org, catalog, endTime, startTime, limit, fields);
    var url = baseUrl + path; //;
    
   

    var getHeaders = {
        'Content-Type' : 'application/json',
        'authorization' : encodedCredentials
    };

    
    var calls = {"totalCalls":0,"next":"","nextHref": url,"calls":[]};
    var count = 1;
    var total = 1;
    var success =[];
    var error=[];
    
    
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
                        writeToLogs(JSON.stringify({'start' : startTime, 'end' : endTime, 'error' : err, 'status' : 'N'}));
                        
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
                    //push error calls
                    thisCall.calls
                        .filter(element => (element.statusCode.startsWith('4') || element.statusCode.startsWith('5')))
                            .forEach(e => error.push(e));
                    //push 2xx calls
                    thisCall.calls
                        .filter(element => element.statusCode.startsWith('2'))
                            .forEach(s => {
                                success.push(s.productName + ',' + s.apiName + ',' + s.statusCode + ',' + s.requestMethod  );
                        });
                        
                    //increment count and go over the loop.
                    count++;
                    nextCall();
                                
        
                }); 

            },
            function (er, n) {
                
                if(er){
                    writeToLogs(JSON.stringify({'start' : startTime, 'end' : endTime, 'error' : er, 'status' : 'n'}));
                }else{
                    // summary success
                    //open success stream
                    let successFile =util.format(config.success_temp_log, startTimeFileName,endTimeFileName );
                    writeSuccessLogs(successFile,success);
                    // error file
                    writeErrorLogs(errorFile, error);
                    console.log('Final Iteration: ' + (count -1));
                    writeToLogs(logFile, JSON.stringify({'start' : startTime, 'end' : endTime ,  'status' : 'y', 'successFile': successFile, 'errorFile': errorFile}));  
                }
            }
);
 
};

var writeToLogs = function ( logFileName,  content ){
    fs.appendFile(logFileName, new Date().toISOString() + '--' +  content + '\n', function(err){
        if(err){
            console.log(err + '|' + content );
        }else{
            console.log(content + ' written in ' + logFileName );
        }

    })

}

var writeSuccessLogs = function(fileName, success){
        //sort first
        success.sort();
        let count=0;
        let grand=0;
        let summation=[];
        //set last value to first row value
        if(success.length>0){

        let writeSuccessStream = fs.createWriteStream(fileName);
        // write header row
        writeSuccessStream.write('product,api,status,method,count\n');
        let lastValue = "";
        success.forEach((element,i) => {
                    if(i==0){
                        lastValue = element;
                        count = 1;
                    } else if(element != lastValue){
                        //if value changed, so now write down the last element.
                        
                        //write line
                        writeSuccessStream.write(lastValue+'|' + count.toString() + '\n');
                        // add counter to grand total
                        grand = grand + count;
                        //reset counter
                        count = 1;
                        //add last value to this value
                        lastValue = element;
                        
                    }else{
                        //increment counter
                        count++;
                    }
        });
        //write final value
        
        writeSuccessStream.write(lastValue+'|' + count.toString() + '\n');
        grand = grand + count;
        // write footer row
        //writeSuccessStream.write('--|--|--|' + grand.toString());
        
        writeSuccessStream.on('finish', () => {  
            console.log('wrote all summary 200 data to file');
        });
        
        // close the stream
        writeSuccessStream.end(); 
    }
}

var writeErrorLogs = function(fileName, error){
    let data = JSON.stringify(error);
    fs.writeFile(fileName, data , function(err){
        if(err){
            console.log(err + '| Fault writing error events'   );
        }else{
            console.log('Error events written in ' + fileName );
        }

    })

}



