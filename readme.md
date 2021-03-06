#  NodeJs app for extracting API data. 

### Key Info

- hosted:   {{hostName}}
- Folder : {{folderPath}}
- Config file : /app/api/config.json
- Service: /etc/systemd/system/apinodeapp.service 
- Log file: /app/api/apim.log

- Source Control : https://github.lbg.eu-gb.bluemix.net/apie/ibm-api-connect-analytics-extraction
- Cron : Runs every 5 mins.

### How it works:

##### Time Span
The node.js app calls the IBM API analtycs  REST API to retrieve call data for a timespan.
http://localhost:2018/api/data?startTime={startTime}&endTime={endTime}'
When no start or end time is provided, the app will default to T and T-5 mins. http://localhost:3006/api/data

##### Iteration 
Depending on the time span, there can be a large number of calls, hence the app retrives and bulk pushes data into Elastic index in an iterative manner. Currently an iteration takes care of 5000 calls (configurable).

##### Runtime
The nodeJs app can be started as `node app.js` from /app/api and also set as continously running service  as defined in /etc/systemd/system/ apinodeapp.service 

##### Change
If changes are needed to make in the app, then changes are first needed to pushed in bitbucket and then copied across to the host server. Once that is done the apinodeapp service needs to be restarted.
 - commit:   git commit -m 'comment'
 - push: git push remote.
 - scp : from lcoal to remote.
*Long term: There should be a jenkins flow for this.*

##### Crontab
`*/5 * * * * curl 'localhost:3006/api/data' >/dev/null 2>&1`
Calls the API every 5 mins.
##### Diagnostics
for every successful run, APIm.log will have one line.
`"start":"2017-09-26T10:20:01.925Z","end":"2017-09-26T10:25:01.925Z","total":4064,"status":"y"`
When the run fails, the status is 'n'.
//
Also service status will give you useful logs.


    service apinodeapp status -l
    redirecting to /bin/systemctl status  -l apinodeapp.service
    ● apinodeapp.service - nodejs app for api data extraction
       loaded: loaded (/etc/systemd/system/apinodeapp.service; enabled; vendor preset: disabled)
       active: active (running) since tue 2017-09-26 11:22:26 bst; 3h 11min ago
     main pid: 30445 (node)
       cgroup: /system.slice/apinodeapp.service
               └─30445 /usr/bin/node /app/api/app.js
  



###End
