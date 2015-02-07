// Disclaimer: Everything needs to run on the same ip/machine

// TODO: URL-rewrite json strings (they could contain illegal characters)
// NOTE: We may need to switch to sync-http requests
//
// MISSING:
// * Det skal være muligt pænt at forlade ringen. 
// * I skal implementere find_successor funktionen, således at man kan finde den ansvarlige peer for et givent id. 
//      SEMI-DONE
// * Den enkelte peer skal overfor en webbrowser præsentere en simpel side;
// ** Hvor man kan foretage en søgning efter id (resultatet et link til den ansvarlige peer),
// * Bonus: Gør jeres ring robust over churn v.hj.a. successorlister.

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
    if(process.argv[2] === "main_node")
    {
        port = main_node_port;
        console.info("Main node requested");
    }
    else if(process.argv[2] === "node")
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
    // NOTE: Comment the below line in for clearity
    // return str;

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
    if(hash_function === null)
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
var chord_node = {}

function find_successor(info)
{
    // TODO: Clean up the below
    function try_next_door()
    {
        return {
            error: 'Try next door',
            next_door: chord_node.successor
        };
    }

    function isBetweenRightIncluded()
    {
        var key1 = chord_node.info.id;
        var key2 = chord_node.successor.id;
        var id = info.id;

    	if (
        // Keys are in order, check that we're inbetween
           ((key1 < key2) && (key1 < id && id <= key2)) ||
        // Keys are not in order, if we're larger than both, we must be less than max
           ((key1 > key2) && ((id > key1 && id >= key2))) ||
        // Keys are not in order, if we're smaller than both, we must be larger than min
           ((key1 > key2) && ((id < key1 && id < key2))) ||
        // We equal key2, so we're in
           ((id === key2)))
        {
            return true;
        }
		return false;
    }

    if(chord_node.info === chord_node.successor)
    {
        chord_node.successor = info;
        return chord_node.info;
    }
    else
    {
        var in_between = isBetweenRightIncluded();
        if(in_between)
        {
            var old_successor = chord_node.successor;
            chord_node.successor = info;
            return old_successor;
        }
        else
        {
            return try_next_door();
        }
    }
}

// Function to join the Chord ring, via the known main node
function chord_join(join_port)
{
    // Setup the HTTP request
    var options = {
        host: 'localhost',
        port: join_port,
        path: '/join?info=' + JSON.stringify(chord_node.info)
    };
    // ... and fire!
    http.get(options, function(res)
    {
        console.log("Got response code: " + res.statusCode);
        res.on("data", function(chunk)
        {
            console.log("Got response: " + chunk);
            var object = JSON.parse(chunk);
            if(object.id != null)
            {
                console.log("Successfully joined the Chord ring");
                chord_node.successor = object;
            }
            else
            {
                if(object.next_door.port === 8080)
                {
                    console.error("Error: Traversed the Chord ring without inserting!");
                    console.error("Terminating");
                    process.exit(1);
                }
                chord_join(object.next_door.port);
            }
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
        // Browser html info page
        case "/":
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write("<html><head><title>Chord Node</title></head><body>");
            res.write("ID: " + chord_node.info.id + "</br>");
            res.write("IP: " + chord_node.info.ip + "</br>");
            res.write("PORT: " + chord_node.info.port + "</br>");
            res.write("</br>");
            res.write("successor: <a href=\"http://");
            if(chord_node.successor.ip = "0.0.0.0")
            {
                res.write("localhost:" + chord_node.successor.port);
            }
            else
            {
                res.write(chord_node.successor.ip + ":" + chord_node.successor.port);
            }
            res.write("\">visit successor</a>");
            // TODO: Predecessor link
            res.write("</body></html>");
            res.end();
            break;

        // JSON id query
        case "/id":
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.write(JSON.stringify(chord_node.info));
            res.end();
            break;

        // JSON successor query
        case "/successor":
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.write(JSON.stringify(chord_node.successor));
            res.end();
            break;

        // JSON join (find_successor) query
        case "/join":
            var info = JSON.parse(query.info);
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.write(JSON.stringify(find_successor(info)));
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
    chord_node.info = {};
    chord_node.info.id = node_id;
    chord_node.info.ip = address.address;
    chord_node.info.port = address.port;

    // If we're the main node, setup the successor as ourself
    if(address.port === main_node_port)
    {
        chord_node.successor = chord_node.info;
        //console.info(chord_node.successor)
    }
    else // If not the main node, join the ring here
    {
        console.info("Trying to join Chord ring:");
        chord_join(main_node_port);
    }
});
