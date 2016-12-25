
module.exports = function(){//dependancies
    var utils=require('bom-utils'),merge=require('merge'),_=require('underscore');

    function HTTPListenerModel(opts){
        if(!opts){opts={};}
        var listener_schema={
                'instance':false, // express listener instance
                'port':false
            };
        for(var s in listener_schema){//set listener_schema default
            if(utils.obj_valid_key(listener_schema, s)){this[s]=typeof(opts[s])!=='undefined'?opts[s]:listener_schema[s];}}
        //if(_.indexOf(typewhitelist,this.type)===-1){this.type=false;throw new Error("[HTTPListenerModel] invalid type provided");}
    }
    HTTPListenerModel.prototype.toString=function(){
        var self=this;
        return "[HTTPListenerModel] "+self.sql;
    };

    return HTTPListenerModel;
}
