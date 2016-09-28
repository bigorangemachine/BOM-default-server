var _ = require('underscore'),//http://underscorejs.org/
    merge = require('merge'),//allows deep merge of objects
    fs = require('fs'),
    url = require('url'),
    utils = require('bom-utils'),
    vars = require('bom-utils/vars');

var express=require('express');
var app=express();

var doc_root='/projects/node-default-server/';





var server3000=app.listen(3000, function () {
    var address=server3000.address();

   console.log("Example app listening Port 3000\n", address);
});

var server9000=app.listen(9000, function () {
    var address=server9000.address();

   console.log("Example app listening Port 9000\n", address);
});



app.get('*', function (req, res, next) {
    res.sendFile(doc_root+'www-assets/index.html');
});
