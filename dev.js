
//modules
var fs = require('fs'),
    utils = require('bom-utils'),
    vars = require('bom-utils/vars');
//custom modules - for WIP
var genericHTTP = require('./index')();
//varaibles
var doc_root='',
    gen_HTTP={},
    root_params={
        'silent':false,//actual settings
        'ports':'',
        'rootmodule':'',
        'config':'./config',
        'found_params':[]
    };

root_params.config=root_params.config;/// ?????
var config=require('./jspkg/configurator')(process, fs, root_params);
doc_root=root_params.doc_root;
root_params.ports=(root_params.ports.trim().length===0?'80,443,3000':root_params.ports).split(',');

fs.stat(doc_root, function(err, stats){
    if((!err || err===null) && stats.isDirectory()){
        function build_route(){
console.log("root_params.ports: ",root_params.ports);
            gen_HTTP.add_route('ASDF',['POST','GET'],root_params.ports,function(pkg,nextFunc){
console.log("ASDF RAN!",pkg);
                setTimeout(function(){
                    console.log("nextFunc!!!");
                    nextFunc(null,{'asdf':'foo'});
                },1500);
                //return true;
            },
            function(pkg){
                for(var k in pkg){
                    console.log("pkg."+k);
                }
            });
        }
        var http_opts={'ports':root_params.ports,'doc_root':doc_root,'silent':false};
        if(doc_root.indexOf('./')===0){//express won't like this
            fs.realpath(doc_root, function(err, relPath){
                if(!err || err===null){
                    doc_root=relPath;
                    http_opts.doc_root=doc_root;
                    gen_HTTP=new genericHTTP(http_opts);
                    build_route();
                }
            });
        }else{
            gen_HTTP=new genericHTTP(http_opts);
            build_route();
        }
    }else{
        console.log("COULD NOT START BAD DOCROOT",err.toString());
        process.exit();//not needed ^_^
    }
});
