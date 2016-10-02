
//modules
var _ = require('underscore'),//http://underscorejs.org/
    merge = require('merge'),//allows deep merge of objects
    express = require('express'),
    app = express(),
    fs = require('fs'),
    url = require('url'),
    utils = require('bom-utils'),
    vars = require('bom-utils/vars');
//custom modules - for WIP
//     vars = require('./jspkg/vars');
//varaibles
var doc_root='',
    root_params={
        'silent':false,//actual settings
        'rootmodule':'',
        'config':'./config',
        'found_params':[]
    };
root_params.config=root_params.config;
var config=require('./jspkg/configurator')(process, fs, root_params);
doc_root=root_params.doc_root;

express.Router().param('megaphone', function(){conle.log("YES",arguments);});
var generic_app=function(req, res){//function(req, res, next){
        var output={'url':'','method':'','body':'','params':'','locals':'','query':'','hostname':'','xhr':'','headers':'','rawHeaders':''};
        for(var k in output){
        //for(var k in req){
            output[k]=req[k];
            console.log(k,' - ',(req[k]!==null && typeof(req[k])==='object'?req[k].constructor.name:req[k]));
        }
console.log("output",output," req.param('megaphone'): ",req.param('megaphone'));//,' req.query ',req.query,' app.param.foo ',app.param('foo','0')
        for(var k in output.params){
            console.log("params["+k+"] ",output.params[k]);
        }
        fs.writeFile(doc_root+'_cache/capture_req-'+utils.getRandomInt(111111,999999).toString()+'-'+( new Date().getTime().toString() )+'.json',JSON.stringify(output),function(){
            var req_file=utils.check_strip_first(url.parse(req.url).pathname,'/');//clean off any query strings
            fs.stat(doc_root+'www-assets/'+req_file, function(err, stats){
                if(err || !stats.isFile()){
                    res.sendFile(doc_root+'www-assets/index.html');
                    //next(); <- not needed right now
                }else{
                    res.sendFile(doc_root+'www-assets/'+req_file, 'binary');
                    //next(); <- not needed right now
                }
            });
        });

    };

app.get('*', generic_app);
app.post('*', generic_app);
app.put('*', generic_app);
app.delete('*', generic_app);

var listeners={'80':{},'443':{},'3000':{}},
    standup_port=function(portNo){
        return function(err,boolRes){
            if(!err || err===null){
                listeners[portNo.toString()]=app.listen(portNo, function(){
                    var address=listeners[portNo.toString()].address(),
                        host=listeners[portNo.toString()].address().address,
                        port=listeners[portNo.toString()].address().port;

                    console.log("Example app listening on port '"+portNo+"' ",address);
                });
            }else{
console.log("ERR: ",err);
            }
        };
    };
var isPortTaken=function(port, fn) {
  var net=require('net'),tester=net.createServer();
  tester.once('error', function(err){if(err.code!='EADDRINUSE'){return fn(err);};fn(null, true);}).once('listening', function(){tester.once('close', function(){fn(null, false);}).close();}).listen(port);
};
isPortTaken(80,standup_port(80));
isPortTaken(443,standup_port(443));
isPortTaken(3000,standup_port(3000));
