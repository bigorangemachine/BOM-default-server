
module.exports = function(){//dependancies
    var utils=require('bom-utils'),merge=require('merge'),_=require('underscore');

    function HTTPHandlerModel(opts){
        if(!opts){opts={};}
        var handler_schema={
                'port':false,
                'methods':['GET'],
                'files':{
                    'default':'index.html',
                    'notfound':'404.html'
                },
                'callback':false
            };
        for(var s in handler_schema){//set handler_schema default
            if(utils.obj_valid_key(handler_schema, s)){this[s]=typeof(opts[s])!=='undefined'?opts[s]:handler_schema[s];}}
        //if(_.indexOf(typewhitelist,this.type)===-1){this.type=false;throw new Error("[HTTPHandlerModel] invalid type provided");}
    }
    HTTPHandlerModel.prototype.toString=function(){
        var self=this;
        return "[HTTPHandlerModel] Port #"+self.port+" methods "+self.methods.join(', ')+".";
    };

    return HTTPHandlerModel;
}
