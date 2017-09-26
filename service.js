var Service = require('node-linux').Service;
 
  // Create a new service object 
  var svc = new Service({
    name:'api',
    description: 'The nodejs. api server.',
    script: '/app/api/app.js'
  });
 
  // Listen for the "install" event, which indicates the 
  // process is available as a service. 
  svc.on('install',function(){
    svc.start();
  });
 
  svc.install();
