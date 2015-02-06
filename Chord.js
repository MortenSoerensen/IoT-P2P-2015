// Disclaimer: Everything needs to run on the same ip/machine

var http = require('http');
var url  = require('url');
var crypto = require('crypto');

// The port to host the server at
var port;
// The main_node (known to be running) port
var main_node_port = 8080;

// Not enough arguments
if(process.argv.length <= 2)
{
    console.error("Not enough arguments provided!");
    console.info("Usage: node Chord.js (main_node | node)");
    return;
}
else // Enough arguments
{
    if(process.argv[2] == "main_node")
    {
        port = main_node_port;
        console.info("Main node requested");
    }
    else if(process.argv[2] == "node")
    {
        // When port is set to zero, a random port will be allocated
        // *A port value of zero will assign a random port.*
        port = 0;
        console.info("Node requested");
    }
    else
    {
        console.error("Invalid node configuration requested");
        return;
    }
}

// Function to hash 'str' with the best feasible hashing algorithm
function hash_string(str)
{
    // Get a list of supported hash functions
    var hash_functions = crypto.getHashes();
    //console.info(hash_functions);

    // Check if we have sha256 and sha1
    var priority_hash_functions = ["sha512", "sha384", "sha256", "sha1"];

    // Pick the best alternative
    var hash_function = null;
    for (var i = 0; i < priority_hash_functions.length; i++)
    {
        var hash = priority_hash_functions[i];
        var has_hash = (hash_functions.indexOf(hash) > -1);
        if(has_hash)
        {
            hash_function = crypto.createHash(hash);
            console.info("Using " + hash + " as hashing function");
            break;
        }
    }
    // No alternative present
    if(hash_function == null)
    {
        console.error("No adequate hash function present, terminating");
        process.exit(1);
    }

    // Do the actual string hashing
    var str_hash = hash_function.update(str).digest('hex');
    return str_hash;
}
// TODO: Remove the lines below
// NOTE: Don't use parseInt
// var hash_alfa = hash_string("alfa");
// console.info(hash_alfa);
// console.info(parseInt(hash_alfa, 16).toString(16));

// Information object about this chord node
var chord_info = {}

// Function to join the Chord ring, via the known main node
function chord_join(join_id)
{
    // Setup the HTTP request
    var options = {
        host: 'localhost',
        port: main_node_port,
        path: '/join?id=' + join_id
    };
    // ... and fire!
    http.get(options, function(res)
    {
        console.log("Successfully joined the Chord ring");
        console.log("Got response code: " + res.statusCode);
        res.on("data", function(chunk)
        {
            // TODO: 'chuck' will contain information about setting up the chord_info
            // TODO: Have chuck be json
            console.log("Got response: " + chunk);
        });
    }).on('error', function(e)
    {
        console.error("Error while joining Chord ring: " + e.message);
        console.error("Terminating");
        process.exit(1);
    });
}

var server = http.createServer(function(req, res)
{
    var url_parts = url.parse(req.url, true);
    var path_name = url_parts.pathname;
    var query = url_parts.query;

    console.info("------------------------------------");
    console.info("Received a request for: " + req.url);
    console.info("The requested path is: " + path_name);
    console.info("Query parameters are:");
    console.log(query); 

    switch(path_name)
    {
        case "/id":
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write(chord_info.id);
            res.end();
            break;

        case "/join":
            var id = query.id;

            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write("Succes!");
            res.end();
            break;
    }
});
// Start the server!
server.listen(port, function()
{
    // Inform the allocated port
    var address = server.address();
    console.log("Running Chord node at port: " + address.port);
    
    // Calculate the node id
    var server_address_string = address.address + ":" + address.port;
    console.info("Full server address: " + server_address_string);
    var node_id = hash_string(server_address_string);
    console.info("Node has id: " + node_id);
    // Assign the node id
    chord_info.id = node_id;

    // If not the main node, join the ring here
    if(address.port != main_node_port)
    {
        console.info("Trying to join Chord ring:");
        chord_join(node_id);
    }
});
