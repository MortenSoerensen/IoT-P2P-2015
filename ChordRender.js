var http = require('http');
var fs = require('fs');

function get_id(port, callback)
{
    // Setup the HTTP request
    var options = {
        host: 'localhost',
        port: port,
        path: '/id'
    };
    // ... and fire!
    http.get(options, function(res)
    {
        res.on("data", function(chunk)
        {
            callback(JSON.parse(chunk));
        });
    }).on('error', function(e)
    {
        console.error("Error while calling get_id: " + e.message);
        console.error("Terminating");
        process.exit(1);
    });
}

function get_next(port, callback)
{
    // Setup the HTTP request
    var options = {
        host: 'localhost',
        port: port,
        path: '/successor'
    };
    // ... and fire!
    http.get(options, function(res)
    {
        res.on("data", function(chunk)
        {
            callback(JSON.parse(chunk).port);
        });
    }).on('error', function(e)
    {
        console.error("Error while calling get_id: " + e.message);
        console.error("Terminating");
        process.exit(1);
    });
}

var stream = fs.createWriteStream("output/Chord.dot");
stream.once('open', function(fd)
{
    stream.write("digraph Chord {\n");
    stream.write("layout=\"circo\";\n");
    stream.write("splines=\"curved\";\n");
    stream.write("entry [label=\"main node\" shape=plaintext fontsize=24];\n");
    stream.write("entry -> port8080;\n");
    
    var previous = null;

    var starter = function recursive(current)
    {
        stream.write("port" + current.port + " [label=\"" + current.ip + ":" + current.port + "\" shape=circle];\n");
        if(previous != null)
        {
            stream.write("port" + previous.port + " -> " + "port" + current.port + ";\n");
        }
        previous = current;

        get_next(previous.port, function(port)
        {
            console.info(port);
            if(port == 8080)
            {
                stream.write("port" + current.port + " -> " + "port" + port + ";\n");
                stream.write("}");
                stream.end();
                return;
            }
            else
            {
                get_id(port, recursive);
            }
        });
    }

    get_id(8080, starter)
});
stream.once('error', function(error)
{
    console.error("Error while creating dot output stream: " + error);
});
