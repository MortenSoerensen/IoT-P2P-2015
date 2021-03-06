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
    //stream.write("layout=\"circo\";\n");
    //stream.write("splines=\"curved\";\n");
    stream.write("entry [label=\"main node\" shape=plaintext fontsize=24];\n");
    stream.write("entry -> port8080;\n");
    
    var starter = function recursive(current)
    {
        current = current.node;
        stream.write("port" + current.info.port + " [label=\"" + current.info.ip + ":" + current.info.port + "\" color=red, shape=circle];\n");
        stream.write("port" + current.info.port + " -> " + "port" + current.successor.port + " [color=red];\n");
        stream.write("port" + current.info.port + " -> " + "port" + current.predecessor.port + ";\n");
        if(current.successor.port == 8080)
        {
            stream.write("}");
            stream.end();
            return;
        }
        else
        {
            get_info(current.successor.port, function(current)
            {
                recursive(current);
            });
        }
    }
    get_info(8080, starter);
});
stream.once('error', function(error)
{
    console.error("Error while creating dot output stream: " + error);
});

var finger_stream = fs.createWriteStream("output/Finger_edges.dot_frag");
finger_stream.once('open', function(fd)
{
    var finger_starter = function recursive(current)
    {
        current = current.node;

        var i = 0;
        while(true)
        {
            if(current.fingertable === undefined)
            {
                break;
            }
            var finger = current.fingertable[i];
            if(finger === undefined || finger === null)
            {
                break;
            }
            finger_stream.write("port" + current.info.port + " -> " + "port" + finger.port + " [color=blue];\n");
            i = i + 1;
        }

        if(current.successor.port == 8080)
        {
            finger_stream.write("}");
            finger_stream.end();
            return;
        }
        else
        {
            get_info(current.successor.port, recursive);
        }
    }
    get_info(8080, finger_starter);
});
finger_stream.once('error', function(error)
{
    console.error("Error while creating dot output stream: " + error);
});
