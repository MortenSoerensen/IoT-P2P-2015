var http = require('http');
var fs = require('fs');

function get_info(port, callback)
{
    // Setup the HTTP request
    var options = {
        host: 'localhost',
        port: port,
        path: '/all'
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
        console.error("Error while calling get_info: " + e.message);
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
    
    var starter = function recursive(current)
    {
        current = current.node;
        stream.write("port" + current.info.port + " [label=\"" + current.info.ip + ":" + current.info.port + "\" shape=circle];\n");
        stream.write("port" + current.predecessor.port + " -> " + "port" + current.info.port + ";\n");
        if(current.successor.port == 8080)
        {
            stream.write("port" + current.info.port + " -> " + "port" + current.successor.port + ";\n");
            stream.write("}");
            stream.end();
            return;
        }
        else
        {
            get_info(current.successor.port, recursive);
        }
    }

    get_info(8080, starter)
});
stream.once('error', function(error)
{
    console.error("Error while creating dot output stream: " + error);
});
