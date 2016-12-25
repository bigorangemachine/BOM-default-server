
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
        if(doc_root.indexOf('./')===0){//express won't like this
            fs.realpath(doc_root, function(err, relPath){
                if(!err || err===null){
                    gen_HTTP=new genericHTTP({'ports':root_params.ports,'doc_root':relPath});
                }
            });
        }else{
            gen_HTTP=new genericHTTP({'ports':root_params.ports,'doc_root':doc_root});
        }
    }else{
        console.log("COULD NOT START BAD DOCROOT",err.toString());
        process.exit();//not needed ^_^
    }
});
