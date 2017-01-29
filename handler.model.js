
module.exports = function(){//dependancies
    var utils=require('bom-utils'),merge=require('merge'),_=require('underscore');

    function HTTPHandlerModel(opts){
        if(!opts){opts={};}
        var handler_schema={
                'ports':[],
                'routes':[],//strings and/or regexps
                'methods':['GET'],
                'files':{
                    'default':'index.html',
                    'notfound':'404.html'
                },
                'action_handler':function(pkg){throw new Error("[HTTPHandlerModel] action callback was not defined. Recieved data '"+pkg.toString()+"'.");},
                'test_handler':function(pkg, nextFunc){
                    throw new Error("[HTTPHandlerModel] test callback was not defined. Recieved data '"+pkg.toString()+"'.");
                    return false;
                    // nextFunc(null,{});//success with results
                    // nextFunc(new Error("There is an Error"));// failure with error object
                    // nextFunc("There is an Error");//failure with message
                }
            };
        for(var s in handler_schema){//set handler_schema default
            if(utils.obj_valid_key(handler_schema, s)){this[s]=typeof(opts[s])!=='undefined'?opts[s]:handler_schema[s];}}
        //if(_.indexOf(typewhitelist,this.type)===-1){this.type=false;throw new Error("[HTTPHandlerModel] invalid type provided");}
        this.methods.forEach(function(v,i,arr){arr[i]=(typeof(v)==='string'?v.toUpperCase():v);});
        this.ports=(this.ports instanceof Array?this.ports:[this.ports]);
        this.ports.forEach(function(v,i,arr){
            arr[i]=v.toString();
        });
    }
    HTTPHandlerModel.prototype.doesMatch=function(uriIn,method,portIn,callbackFunc){//callbackFunc(err, responseObj)
        var self=this,
            output={},
            isErr=false,
            genErr=new Error("[HTTPHandlerModel] Did not match request method."),
            matched_indexes=[];
        method=(typeof(method)==='string'?method.toUpperCase():'');
        portIn=(typeof(portIn)!=='string'?portIn.toString():portIn);
        if(typeof(uriIn)!=='string'){throw new Error("[HTTPHandlerModel] doesMatch(): first argument '"+uriIn+"' is not a string.");}
        if(typeof(callbackFunc)!=='function'){throw new Error("[HTTPHandlerModel] callbackFunc(): third argument '"+callbackFunc.toString()+"' is not a function.");}

        if(_.indexOf(self.methods,method)===-1 || _.indexOf(self.ports,portIn)===-1){
            isErr=genErr;
        }else if(self.routes.length===0 || self.ports.length===0){//set nothing? Match everything!
            matched_indexes.push(NaN);//fail the index but set a positive result check
        }else{
            self.routes.forEach(function(v,i,arr){

                if(v instanceof RegExp){
                    var regexp_results=uriIn.match(v);
                    if(regexp_results!==null && typeof(regexp_results)==='object' && regexp_results.length>0){
                        matched_indexes.push(i);
                    }
                }else if(typeof(v)==='string' && uriIn===v){
                    matched_indexes.push(i);
                }
            });
        }

        if(matched_indexes.length===0){isErr=genErr;}
        output={
            'error':isErr,
            'result':{},
            'uri':uriIn,
            'method':method,
            'port':portIn,
            'routes':matched_indexes.map(function(v){return self.routes[v];})
        };
        var test_handler_res=null,
            did_sync_resolve=false,
            exited=false,
            binded_next=function(err, res){
                if(!exited){
                    exited=true;
                    output.result=res;
                    if(isErr){return callbackFunc(isErr,{});}
                    else if(err instanceof Error || (err && err!==null)){return callbackFunc(err,{});}
                    return callbackFunc(null, output);
                }
            };
        if(matched_indexes.length===0){
            did_sync_resolve=true;
            test_handler_res=false;
            binded_next();
        }else{
            test_handler_res=(typeof(self.test_handler)==='function'?self.test_handler(output, binded_next):true);
            if(typeof(test_handler_res)==='boolean'){did_sync_resolve=true;}//no async needed
            if(did_sync_resolve){
                if(test_handler_res===false){isErr=genErr;}
                binded_next();
            }
        }
    };
    HTTPHandlerModel.prototype.toString=function(){
        var self=this;
        return "[HTTPHandlerModel] Port #"+self.port+" methods "+self.methods.join(', ')+" "+" routes "+self.routes.map(function(obj){return obj.toString();}).join(", ")+".";
    };

    return HTTPHandlerModel;
}
