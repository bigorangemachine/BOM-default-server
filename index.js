var express=require('express');
var app=express();

app.get('/', function (req, res) {
   res.send('Hello World');
});


var server80=app.listen(80, function () {
    var host=server8081.address().address,
        port=server8081.address().port;

   console.log("Example app listening at http://%s", host)
});


var server443=app.listen(443, function () {
    var host=server8081.address().address,
        port=server8081.address().port;

    console.log("Example app listening at https://%s:%s", host, port)
});

var server666=app.listen(666, function () {
    var host=server666.address().address,
        port=server666.address().port;

    console.log("Example app listening at http://%s:%s", host, port)
});
