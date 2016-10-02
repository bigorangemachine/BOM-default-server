var argv = require('yargs').argv,//https://github.com/yargs/yargs
    _ = require('underscore'),//http://underscorejs.org/
    merge = require('merge'),//allows deep merge of objects
    fs = require('fs'),
    url = require('url'),
    utils = require('bom-utils'),
    vars = require('bom-utils/vars');

var express=require('express');
var app=express();

var default_file='index.html',
    doc_root='/projects/node-default-server/';

if(typeof(argv.default)==='string'){//node index.js --default=whale
    default_file=utils.check_strip_last(argv.default,'.html')+'.html';
    fs.stat(doc_root+'www-assets/'+default_file, function(err, stats){
        if(err || !stats.isFile()){
            console.error("Default file '"+default_file+"' was not found.");
            process.exit();
        }
    });
}




var server3000=app.listen(3000, function () {
    var address=server3000.address();

   console.log("Example app listening Port 3000\n", address);
});

var server9000=app.listen(9000, function () {
    var address=server9000.address();

   console.log("Example app listening Port 9000\n", address);
});



app.get('*', function (req, res, next) {
    var req_file=utils.check_strip_first(url.parse(req.url).pathname,'/');//clean off any query strings
    fs.stat(doc_root+'www-assets/'+req_file, function(err, stats){
        if(err || !stats.isFile()){
            res.sendFile(doc_root+'www-assets/'+default_file);
        }else{
            res.sendFile(doc_root+'www-assets/'+req_file, 'binary');
        }
    });

});
