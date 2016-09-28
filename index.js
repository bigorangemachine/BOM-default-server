var express=require('express');
var app=express();

app.get('/', function (req, res) {
   res.send('Hello World');
});


var server3000=app.listen(3000, function () {
    var address=server3000.address();

   console.log("Example app listening Port 3000\n", address);
});

var server9000=app.listen(9000, function () {
    var address=server9000.address();

   console.log("Example app listening Port 3000\n", address);
});
