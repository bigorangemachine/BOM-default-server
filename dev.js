
//modules
var fs = require('fs'),
    url = require('url'),
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
        var http_opts={
                'ports':root_params.ports,'doc_root':doc_root,'silent':false,
                'hook_ins':{
                    'pre_use':function(pkg){
                        pkg.express.use((function(){
                            return function(req, res, cb){
                                var old_send = res.write;
                                res.write = function (chunk) {
                                    //if default handler
                                    if (res.routed.is_asset && res.routed.is_requestable && res.routed.route_result===false && utils.get_ext(res.routed.req_file).toLowerCase()==='html') {//TDI - http://stackoverflow.com/questions/10094405/what-does-do-in-javascript-node-js
                                        var reqest_url=req.protocol + '://' + req.get('host') + req.originalUrl,
                                            parsed_url_obj=url.parse(reqest_url);
                                        chunk instanceof Buffer && (chunk = chunk.toString());//chunk.constructor.name==='Buffer'
                                        chunk = utils.parse_subtext(chunk,{'baseurl':req.protocol + '://' + req.get('host')});

                                        if(!res.headersSent){res.setHeader('Content-Length', chunk.length);}
                                    }
                                    old_send.apply(this, arguments);
                                };
                                cb();
                            };
                        })());
                    }
                }
            };
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
