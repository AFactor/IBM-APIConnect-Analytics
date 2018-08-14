var request = require('request');
var util = require("util");
var f = module.exports = {};
var async = require("async");
var dateFormat = require('dateformat');
var config = require('./config.json');


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
    var errorHeader=false;
    var total = 1;
    var success =[];
    var error=[];
    let writeErrrorStream = fs.createWriteStream(errorFile);
    
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
                        return ibmCallback({'start' : startTime, 'end' : endTime, 'error' : err, 'status' : 'N'}, null);
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
                            success.push(s.apiName + '|' + s.statusCode + '|' + s.requestMethod  );
                        });
                        
                    }
                    
        
                    count++;
                    nextCall();
                                
        
                }); 

            },
            function (er, n) {
                closeErrorLogs(writeErrrorStream)
                if(er){
                    writeToLogs(JSON.stringify({'start' : startTime, 'end' : endTime, 'error' : er, 'status' : 'n'}));
                    return ibmCallback({'start' : startTime, 'end' : endTime, 'error' : er, 'status' : 'n'}, null);
                }else{
                    // summary success
                    //open success stream
                    let successFile =util.format(config.success_temp_log, startTimeFileName,endTimeFileName );
                    writeSuccessLogs(successFile,success);

                    console.log('Final Iteration: ' + (count -1));
                    writeToLogs(logFile, JSON.stringify({'start' : startTime, 'end' : endTime ,  'status' : 'y', 'successFile': successFile, 'errorFile': errorFile}));
                    return ibmCallback(null, {'start' : startTime, 'end' : endTime ,  'status' : 'y', 'successFile': successFile, 'errorFile': errorFile});
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
        writeSuccessStream.write('api|status|method|count\n');
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

var closeErrorLogs = function(stream){
    stream.on('finish', () => {  
        console.log('wrote all error data to file');
    });
    // close the stream
    stream.end(); 
}



