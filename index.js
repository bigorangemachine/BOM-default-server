module.exports = function(){
    //modules
    var _ = require('underscore'),//http://underscorejs.org/
        merge = require('merge'),//allows deep merge of objects
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
                        self.request_handler.apply(self, [this, req, res, method]);
                    };
                },
                standup_port=function(portNo){
                    return function(err,boolRes){
                        if(!err || err===null){//absence of an error -> We're good!
                            self.listeners[portNo]=new HTTPListenerModel({
                                'port':portNo,
                                'instance':express_obj.listen(portNo, function(){
                                    var address_obj=self.listeners[portNo].instance.address(),
                                        host=address_obj.address,
                                        port=address_obj.port;
                                    if(!self.silent){console.log("[DefaultHTTPServer] TCP/IP listening on port '"+portNo+"' ",address_obj);}

                                })
                            });
                        }else{//failed to listen - got an error result
                            if(!self.silent){console.log("[DefaultHTTPServer] ERR: ",err);}
                        }
                    };
                };
            express_obj.use(bodyParser.json()); // support json encoded bodies
            express_obj.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

            self.ports.forEach(function(v,i,arr){
                var port=(typeof(v)==='string' || typeof(v)==='number'?v.toString():false);
                if(v instanceof HTTPHandlerModel || (typeof(v)==='object' && typeof(v.port)!=='undefined')){
                    port=v.port.toString();
                }
                if(port){//valid
                    self.isPortTaken(port,standup_port(v));
                    arr[i]=(v instanceof HTTPHandlerModel?v:new HTTPHandlerModel({'port':port}));//eventually I will allow individual notfound/index files to be declared
                }
            });

            express_obj.get('*', generic_app('GET'));
            express_obj.post('*', generic_app('POST'));
            express_obj.put('*', generic_app('PUT'));
            express_obj.delete('*', generic_app('DELETE'));
        };

    //statics
    var schema={'listeners':{}};

    function DefaultHTTPServer(opts){
        var self=this;
        if(!opts){opts={};}

        opts.silent=(typeof(opts.silent)==='boolean'?opts.silent:false);
        opts.ports=(typeof(opts.ports)==='object' && opts.ports instanceof Array && opts.ports.length>0?opts.ports:['80','443','3000']);
        opts.doc_root=(typeof(opts.doc_root)==='string'?opts.doc_root:'./');

        opts.file_index=(typeof(opts.file_index)==='string'?opts.file_index:'index.html');
        opts.file_notfound=(typeof(opts.file_notfound)==='string'?opts.file_notfound:'404.html');
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
                        'get_request': (typeof(opts.hook_ins.get_request)==='function'?opts.hook_ins.get_request:false),
                        'post_request': (typeof(opts.hook_ins.post_request)==='function'?opts.hook_ins.post_request:false),
                        'put_request': (typeof(opts.hook_ins.put_request)==='function'?opts.hook_ins.put_request:false),
                        'delete_request': (typeof(opts.hook_ins.delete_request)==='function'?opts.hook_ins.delete_request:false)
                    }, this)
                }
            };

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

    DefaultHTTPServer.prototype.handler_schema=function() {
        return new HTTPHandlerModel();
    };

    DefaultHTTPServer.prototype.request_handler=function(instanceIn, req, res, reqMethod) {
        var self=this,
            do_log=false,
            hook_ins=self._SCOPE_.protected_opts.hook_ins,
            asset_root=self.doc_root + utils.check_strip_last(self.asset_path,'/') + '/',
            req_file=utils.check_strip_first(url.parse(req.url).pathname,'/'),//clean off any query strings
            arg_payload={'request_this':instanceIn,'res':res,'res':req, 'method':reqMethod};
console.log("req.url: ",req.url,"\n\tself.default_files: ",self.default_files);
        //filters T.^
        if(reqMethod==='GET'){
            hook_ins.icallback('get_request',arg_payload);
        }else if(reqMethod==='POST'){
            hook_ins.icallback('post_request',arg_payload);
        }else if(reqMethod==='PUT'){
            hook_ins.icallback('put_request',arg_payload);
        }else if(reqMethod==='DELETE'){
            hook_ins.icallback('delete_request',arg_payload);
        }
console.log("asset_root: "+asset_root+" \n\tself.default_files.notfound: ",self.default_files.notfound);
        fs.stat(asset_root + req_file, function(err, stats){
            if(err || !stats.isFile()){
                res.sendFile(asset_root+self.default_files.notfound); //next(); <- not needed right now
            }else{
                res.sendFile(asset_root + req_file, 'binary'); //next(); <- not needed right now
            }
        });

        if(do_log){//log posts
            self.request_logger(req);
        }
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
console.log(k,' - ',(req[k]!==null && typeof(req[k])==='object'?req[k].constructor.name:req[k]));
            }

        fs.writeFile(self.doc_root + utils.check_strip_last(self.log_path,'/') + '/' + 'capture_req-'+utils.getRandomInt(111111,999999).toString()+'-'+( new Date().getTime().toString() )+'.json',JSON.stringify(output),function(err){
            if(err){
                if(!self.silent){console.log("[DefaultHTTPServer] Failed to log file. Reason:\n"+err);}
            }
        });
    };

    return DefaultHTTPServer;
}
