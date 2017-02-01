module.exports = function(){
    //modules
    var _ = require('underscore'),//http://underscorejs.org/
        merge = require('merge'),//allows deep merge of objects
        md5 = require('MD5'),
        express = require('express'),
        express_obj = express(),
        fs = require('fs'),
        url = require('url'),
        utils = require('bom-utils'),
        vars = require('bom-utils/vars'),
        bodyParser = require('body-parser'),
        GLaDioS=require('GLaDioS')(),
        HTTPHandlerModel=require('./handler.model')(),
        HTTPListenerModel=require('./server.model')();

    //var parentDefaultHTTPServer=require('parentDefaultHTTPServer')(); <- expected
    var self_init=function(opts){//private methods
            var self=this,
                generic_app=function(method){
                    method=method.trim().toUpperCase();
                    return function(req, res){//express detects number of args :/ ?
                        self.request_handler.apply(self, [this, req, res, method]);//this is coming through as node root - chage this!
                    };
                },
                standup_port=function(portNo){
                    return function(err,boolRes){
                        if(!err || err===null){//absence of an error -> We're good!
                            self.listeners['port_'+portNo]=self.listener_schema({
                                'port':portNo,
                                'instance':express_obj.listen(portNo, function(){
                                    var address_obj=self.listeners['port_'+portNo].instance.address(),
                                        host=address_obj.address,
                                        port=address_obj.port;
                                    if(!self.silent){console.log("[DefaultHTTPServer] TCP/IP listening on port '"+portNo+"' ",address_obj);}

                                })
                            });
//console.log("self.listeners['port_'+portNo]: ",self.listeners['port_'+portNo]);
                        }else{//failed to listen - got an error result
                            if(!self.silent){console.log("[DefaultHTTPServer] ERR: ",err);}
                        }
                    };
                };
            express_obj.disable('x-powered-by');
            self.hook_ins.icallback('pre_use',{'express':express_obj});
            express_obj.use(bodyParser.json()); // support json encoded bodies
            express_obj.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies -> So we can parse POST data
            self.hook_ins.icallback('post_use',{'express':express_obj});

            self.ports.forEach(function(v,i,arr){
                var port=(typeof(v)==='string' || typeof(v)==='number'?v.toString():false);
                if(v instanceof HTTPHandlerModel || (typeof(v)==='object' && typeof(v.ports)!=='undefined')){
                    port=v.ports.toString();
                }
                if(port){//valid
                    self.isPortTaken(port,standup_port(v));
                    arr[i]=(v instanceof HTTPHandlerModel?v:self.handler_schema({'ports':port}));//eventually I will allow individual notfound/index files to be declared
                }
            });

            express_obj.get('*', generic_app('GET'));
            express_obj.post('*', generic_app('POST'));
            express_obj.put('*', generic_app('PUT'));
            express_obj.delete('*', generic_app('DELETE'));
        };

    //statics
    var schema={'listeners':{},'parsers':{}};

    function DefaultHTTPServer(opts){
        var self=this;
        if(!opts){opts={};}

        opts.silent=(typeof(opts.silent)==='boolean'?opts.silent:false);
        opts.ports=(typeof(opts.ports)==='object' && opts.ports instanceof Array && opts.ports.length>0?utils.clone(opts.ports):['80','443','3000']);
        opts.doc_root=(typeof(opts.doc_root)==='string'?utils.check_strip_last(opts.doc_root,'/') + '/':'./');

        opts.file_index=(typeof(opts.file_index)==='string'?opts.file_index:'index.html');
        opts.file_notfound=(typeof(opts.file_notfound)==='string'?opts.file_notfound:'whale.html');
        opts.log_path=(typeof(opts.log_path)==='string'?opts.log_path:'_cache/');
        opts.asset_path=(typeof(opts.asset_path)==='string'?opts.asset_path:'www-assets/');

        //wrapped so I can use 'self' (this gets confusing)
        (function(opts){//args probably not needed ^_^
            var self=this;

            opts.hook_ins=(typeof(opts.hook_ins)==='object'?opts.hook_ins:{});

            self._SCOPE_={
                'readonly_opts':{
                    'asset_path':opts.asset_path,
                    'log_path':opts.log_path,
                    'doc_root':opts.doc_root,
                    'ports':opts.ports,
                    //'ports':opts.ports.concat([]),
                    'silent':opts.silent
                },
                'protected_rules':{
                    'hook_ins':{
                        'canset':function(valSet){
                            //probably want to validate hook_ins schema but lets just let it be for now
                            return true;
                        },
                        'passbyref':true
                    }
                },
                'protected_opts':{
                    'default_files':{
                        'index':opts.file_index,
                        'notfound':opts.file_notfound
                    },
                    'hook_ins':new GLaDioS({
                        'pre_use': (typeof(opts.hook_ins.pre_use)==='function'?opts.hook_ins.pre_use:false),
                        'post_use': (typeof(opts.hook_ins.post_use)==='function'?opts.hook_ins.post_use:false),
                        'get_request': (typeof(opts.hook_ins.get_request)==='function'?opts.hook_ins.get_request:false),
                        'post_request': (typeof(opts.hook_ins.post_request)==='function'?opts.hook_ins.post_request:false),
                        'put_request': (typeof(opts.hook_ins.put_request)==='function'?opts.hook_ins.put_request:false),
                        'delete_request': (typeof(opts.hook_ins.delete_request)==='function'?opts.hook_ins.delete_request:false)
                    }, this)
                }
            };

            self._SCOPE_.protected_opts.hook_ins.change_text('pre_use', '[DefaultHTTPServer-hook_ins] Before default properties are set using \'express.use()\'');
            self._SCOPE_.protected_opts.hook_ins.change_text('post_use', '[DefaultHTTPServer-hook_ins] After default properties are set using \'express.use()\'');
            self._SCOPE_.protected_opts.hook_ins.change_text('get_request', '[DefaultHTTPServer-hook_ins] When get request');
            self._SCOPE_.protected_opts.hook_ins.change_text('post_request', '[DefaultHTTPServer-hook_ins] When post request');
            self._SCOPE_.protected_opts.hook_ins.change_text('put_request', '[DefaultHTTPServer-hook_ins] When put request');
            self._SCOPE_.protected_opts.hook_ins.change_text('delete_request', '[DefaultHTTPServer-hook_ins] When delete request');

            //private variables - need to be objects
            var protected_getter=function(keyIn){return function(){
                        var ispbr=(typeof(self._SCOPE_.protected_rules[keyIn])==='object' && self._SCOPE_.protected_rules[keyIn].passbyref?true:false);

                        if(!ispbr && (self._SCOPE_.protected_opts[keyIn] instanceof Array || self._SCOPE_.protected_opts[keyIn].constructor===Object)){
                            return utils.clone(self._SCOPE_.protected_opts[keyIn]);
                        }
                        return self._SCOPE_.protected_opts[keyIn];
                    }
                },
                protected_setter=function(keyIn){return function(v){
                        var setresult=(typeof(self._SCOPE_.protected_rules[keyIn])==='object' && typeof(self._SCOPE_.protected_rules[keyIn].canset)==='function'?self._SCOPE_.protected_rules[keyIn].canset.apply(self,[v]):true);
                        if(setresult){
                            self._SCOPE_.protected_opts[keyIn]=v;
                        }
                    }
                },
                readonly_getter=function(keyIn){return function(){return self._SCOPE_.readonly_opts[keyIn]}};
            if((typeof(Object.defineProperty)!=='function' && (typeof(this.__defineGetter__)==='function' || typeof(this.__defineSetter__)==='function'))){//use pre IE9
                //protected
                this.__defineSetter__('hook_ins', protected_getter('hook_ins'));
                this.__defineGetter__('hook_ins', protected_setter('hook_ins'));
                this.__defineSetter__('default_files', protected_getter('default_files'));
                this.__defineGetter__('default_files', protected_setter('default_files'));

                //readonly
                this.__defineGetter__('asset_path', readonly_getter('asset_path'));
                this.__defineGetter__('log_path', readonly_getter('log_path'));
                this.__defineGetter__('doc_root', readonly_getter('doc_root'));
                this.__defineGetter__('ports', readonly_getter('ports'));
                this.__defineGetter__('silent', readonly_getter('silent'));
            }else{
                //protected
                Object.defineProperty(this, 'hook_ins', {'set': protected_setter('hook_ins'),'get': protected_getter('hook_ins')});
                Object.defineProperty(this, 'default_files', {'set': protected_setter('default_files'),'get': protected_getter('default_files')});

                //readonly
                Object.defineProperty(this, 'asset_path', {'get': readonly_getter('asset_path')});
                Object.defineProperty(this, 'log_path', {'get': readonly_getter('log_path')});
                Object.defineProperty(this, 'doc_root', {'get': readonly_getter('doc_root')});
                Object.defineProperty(this, 'ports', {'get': readonly_getter('ports')});
                Object.defineProperty(this, 'silent', {'get': readonly_getter('silent')});
            }

        }).apply(this,[opts]);
        //model setter!
        for(var s in schema){//set schema default
            if(utils.obj_valid_key(schema, s)){this[s]=(typeof(opts[s])!=='undefined'?opts[s]:schema[s]);}}

		self_init.apply(this,[opts]);//start! self_init that passes the 'this' context through
        // parentDefaultHTTPServer.prototype.constructor.apply(this,[opts]);//extend parent constructor :D - do this here? or earlier
	};
    // DefaultHTTPServer.prototype=Object.create(parentDefaultHTTPServer.prototype);//extend parent
    // DefaultHTTPServer.prototype.constructor=DefaultHTTPServer;//reinforce typing (debugger shows correct model when you do this but it doesn't really make a difference unless you are type crazy)

    //public methods
    DefaultHTTPServer.prototype.isPortTaken=function(port, fn) {
        var self=this,
            net=require('net'),
            tester=net.createServer();
        tester.once('error', function(err){
            if(err.code!='EADDRINUSE'){
                return fn(err);
            }
            fn(null, true);
        }).once('listening', function(){
            tester.once('close', function(){
                fn(null, false);
            }).close();
        }).listen(port);
    };

    DefaultHTTPServer.prototype.handler_schema=function(opts) {
        return new HTTPHandlerModel(opts);
    };
    DefaultHTTPServer.prototype.listener_schema=function(opts){
        return new HTTPListenerModel(opts);
    };

    DefaultHTTPServer.prototype.request_handler=function(instanceIn, req, res, reqMethod) {
        var self=this,
            reqstamp=new Date(),
            reqest_url=req.protocol + '://' + req.get('host') + req.originalUrl,
            do_log=false,
            hook_ins=self._SCOPE_.protected_opts.hook_ins,
            asset_root=self.doc_root + utils.check_strip_last(self.asset_path,'/') + '/',
            parsed_url_obj=url.parse(reqest_url),
            port=parsed_url_obj.port,
            req_file=utils.check_strip_first(parsed_url_obj.pathname,'/'),//clean off any query strings by using pathname
            arg_payload={
                'request_this':instanceIn,
                'res':res,
                'req':req,
                'method':reqMethod,
                'route_result':{},
                'valid_routes':[],
                'is_asset':false,
                'is_requestable':false
            };

        do{
            req_file=req_file.replace(/(^\.\/)|(\.{2,}\/+)/gi,'');
        }while(req_file.indexOf('./')===0);//just be sure - file injection
        req_file=(req_file.length===0?self.default_files.index:req_file);
        if(!self.silent){console.log("[DefaultHTTPServer] Begining Request:\n\tURL: ",reqest_url,"\n\tDate: ",reqstamp.toDateString());}
        fs.stat(asset_root + req_file, function(err, stats){//resolve assets first
            if(err || !stats.isFile()){
                //req_file=self.default_files.notfound;
                //res.sendFile(asset_root+self.default_files.notfound); //next(); <- not needed right now
            }else{
                arg_payload.is_asset=true;
                arg_payload.is_requestable=true;
                //res.sendFile(asset_root + req_file, 'binary'); //next(); <- not needed right now
            }
            var resolve_request=function(checkedRoutes){
                    var do_route=false;
                    if(arg_payload.is_requestable && checkedRoutes.length>0){
                        checkedRoutes.forEach(function(v,i,arr){//after iterating through the 'self.listeners' and processing them
                            if(checkedRoutes[i].success){
                                //set the first found - this is temp... probably need to write better matching -> for now just do the first found
                                if(!do_route){arg_payload.valid_routes.push(self.listeners[ (checkedRoutes[i]) ]);}
                                do_route=(!do_route?checkedRoutes[i]:do_route);
                            }
                        });
                    }

                    arg_payload.route_result=(do_route?do_route.result:arg_payload.route_result);

                    //filters T.^
                    if(reqMethod==='GET'){hook_ins.icallback('get_request',arg_payload);}
                    else if(reqMethod==='POST'){hook_ins.icallback('post_request',arg_payload);}
                    else if(reqMethod==='PUT'){hook_ins.icallback('put_request',arg_payload);}
                    else if(reqMethod==='DELETE'){hook_ins.icallback('delete_request',arg_payload);}

                    res.routed={'req_file':req_file};//pass into middleware
                    for(var k in arg_payload){
                        if(utils.obj_valid_key(arg_payload, k) && k!=='req' && k!=='res'){res.routed[k]=arg_payload[k];}}

                    if(do_route && self.listeners[do_route.indexkey] instanceof HTTPHandlerModel){
                        if(!self.silent){console.log("[DefaultHTTPServer] Serving up route '"+do_route.indexkey+"'.");}

                        self.listeners[do_route.indexkey].action_handler(arg_payload);
                    }else if(arg_payload.is_asset && arg_payload.is_requestable){
                        if(!self.silent){console.log("[DefaultHTTPServer] Serving up asset file '"+asset_root + req_file+"'.");}
                        res.sendFile(asset_root + req_file, 'binary');
                    }else{
                        if(!self.silent){console.log("[DefaultHTTPServer] Serving up failure '"+asset_root+self.default_files.notfound+"' from attempted '"+reqest_url+"'.");}
                        res.status(404).sendFile(asset_root+self.default_files.notfound);
                    }
                    if(do_log){self.request_logger(req);}//log posts
                    if(!self.silent){console.log("[DefaultHTTPServer] End Request:\n\tURL: ",reqest_url,"\n\tDate: ",reqstamp.toDateString());}
                },
                listener_match=false,
                task_schema={'complete':false,'success':false,'indexkey':false,'result':false,'callback':false,'model':false},
                tasks=[],
                task_check=function(tasks){//did all them finish?
                    var found=0,maxfound=tasks.length;
                    tasks.forEach(function(v,i,arr){if(v.complete){found++;}});
                    if(found>=maxfound){resolve_request(tasks);}
                };
            for(var k in self.listeners){
                //uriIn,method,portIn,callbackFunc
                if(!utils.obj_valid_key(self.listeners,k)){continue;}
                //self.listeners[k].doesMatch(req_file,reqMethod,port,req)
                (function(key){
                    var tmp_schema=merge(true,{},task_schema,{'indexkey':key});
                    tmp_schema.callback=function(){
                            if(self.listeners[key] instanceof HTTPListenerModel && self.listeners[key].port===port){//generic listener is valid
                                tmp_schema.success=true;
                                tmp_schema.complete=true;
                                tmp_schema.model='listener';
                                task_check(tasks);
                            }else if(!(self.listeners[key] instanceof HTTPHandlerModel)){
                                tmp_schema.complete=true;
                                tmp_schema.model='handler';
                                task_check(tasks);
                            }else{
//console.log("-"+key,"-\nreq_file: ",req_file,"\n\tport",port,"self.listeners[key]: ",self.listeners[key],"\n\t",self.listeners[key].constructor);
                                self.listeners[key].doesMatch(req_file,reqMethod,port,req.body,function(err, resp){
                                    if(!err || err===null){
                                        tmp_schema.success=true;
                                        tmp_schema.result=resp;
                                        arg_payload.is_requestable=true;
                                    }
                                    tmp_schema.complete=true;
                                    task_check(tasks);
                                });
                            }
                        };

                    tasks.push(tmp_schema);
                })(k);
            }
            tasks.forEach(function(v){
                v.callback.apply(self,[]);
            });
            //this should pourtals.js

        });
    };

    DefaultHTTPServer.prototype.add_route=function(uri,methods,ports,handlerFunc,actionFunc) {
        var self=this;
        if(typeof(uri)==='string' || uri instanceof RegExp){uri=[uri];}
        if(typeof(ports)==='string' || typeof(ports)==='number'){ports=[ports];}
        if(typeof(methods)==='string'){methods=[methods];}
//console.log("B4 uri: ",uri," ports: ",ports);
        if(!(uri instanceof Array)){throw new Error("[DefaultHTTPServer] add_route() first argument is not instanceof RegExp/Array/String.");}
        if(!(methods instanceof Array)){throw new Error("[DefaultHTTPServer] add_route() second argument is not typeof array/string.");}
        if(!(ports instanceof Array)){throw new Error("[DefaultHTTPServer] add_route() third argument is not typeof array/number/string.");}
        if(typeof(handlerFunc)!=='undefined' && typeof(handlerFunc)!=='function'){throw new Error("[DefaultHTTPServer] add_route() fourth argument is not a function.");}
        if(typeof(actionFunc)!=='undefined' && typeof(actionFunc)!=='function'){throw new Error("[DefaultHTTPServer] add_route() fifth argument is not a function.");}
//console.log("AF uri: ",uri," ports: ",ports);
        for(var i=0;i<uri.length;i++){
            if(!(typeof(uri[i])==='string' || uri[i] instanceof RegExp)){throw new Error("[DefaultHTTPServer] add_route() first argument must be a list only containing String/RegExp types: provided '"+uri[i].toString()+"'.");}
        }

        var index_stamp=md5(uri.toString())+"-"+methods.join(',')+"-"+ports.join(',');
        self.listeners[index_stamp]=self.handler_schema({
            'ports':ports,
            'routes':uri,
            'methods':methods,
            'action_handler':(typeof(actionFunc)==='function'?actionFunc:false),
            'test_handler':(typeof(handlerFunc)==='function'?handlerFunc:false)
        });
        return index_stamp;
    };

    DefaultHTTPServer.prototype.express=function() {
        return express_obj;
    };
    DefaultHTTPServer.prototype.request_logger=function(req) {
        var self=this,
            output={//what are we capturing in req
                'url':'',
                'method':'',
                'body':'',
                'params':'',
                'locals':'',
                'query':'',
                'hostname':'',
                'xhr':'',
                'headers':'',
                'rawHeaders':''
            };
            //for(var k in req){
            for(var k in output){
                output[k]=req[k];
//console.log(k,' - ',(req[k]!==null && typeof(req[k])==='object'?req[k].constructor.name:req[k]));
            }

        fs.writeFile(self.doc_root + utils.check_strip_last(self.log_path,'/') + '/' + 'capture_req-'+utils.getRandomInt(111111,999999).toString()+'-'+( new Date().getTime().toString() )+'.json',JSON.stringify(output),function(err){
            if(err){
                if(!self.silent){console.log("[DefaultHTTPServer] Failed to log file. Reason:\n"+err);}
            }
        });
    };

    return DefaultHTTPServer;
}
