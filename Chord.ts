// Disclaimer: Everything needs to run on the same ip/machine
//              --> NOTE: Easily fixable
//
// TODO: URL-rewrite json strings (they could contain illegal characters)
// TODO: ID padding / rejection
//
// MISSING:
// * Bonus: Gør jeres ring robust over churn v.hj.a. successorlister.

// Declare the nodejs require function
declare function require(name : string);

var http = require('http');
var url  = require('url');
var crypto = require('crypto');

module node
{
    // Information object about this chord node
    var chord_node : any = {};

    function ip_to_string(ip) : string
    {
        if(ip === "0.0.0.0")
            return "localhost";
        else
            return ip;
    }

    export function run(host_port) : void
    {
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
                    res.write(chord_node.successor.ip + ":" + chord_node.successor.port);
                    res.write("\">visit successor</a>");
                    res.write("<br/>");
                    if(chord_node.predecessor === undefined)
                    {
                        console.error(chord_node.info.port + " says FUCK");
                    }
                    else
                    {
                        res.write("predecessor: <a href=\"http://");
                            res.write(chord_node.predecessor.ip + ":" + chord_node.predecessor.port);
                            res.write("\">visit predecessor</a>");
                            res.write("<br/>");
                    }
                    res.write("<br/>");

                    res.write("<label>Enter ID:</label><textarea id=\"succ\" rows=\"1\" cols=\"10\"></textarea>");
                    res.write("<button onclick=\"find_succ()\">Find responsible node</button>");

                    res.write("<script>\n");
                    res.write("function find_succ()\n");
                    res.write("{\n");
                        res.write("var succ = document.getElementById(\"succ\");\n");
                        res.write("alert(succ.value);\n");
                        res.write("var xmlhttp = new XMLHttpRequest();\n");
                        res.write("var url = \"find_successor?id=\" + succ.value;\n");
                        res.write("xmlhttp.onreadystatechange = function() {\n");
                            res.write(" if (xmlhttp.readyState == 4 && xmlhttp.status == 200)\n");
                            res.write(" { alert(xmlhttp.responseText);\n");
                                res.write(" var json = JSON.parse(xmlhttp.responseText);\n");
                                res.write(" var goto = \"http://\" + json.suc.ip + \":\" + json.suc.port;\n");
                                    res.write(" alert(goto);\n");
                                    res.write(" window.location.href = goto; }\n");
                                    res.write("}\n");
                                    res.write("xmlhttp.open(\"GET\", url, true);\n");
                                    res.write("xmlhttp.send();\n");
                                    res.write("}\n");
                                    res.write("</script>\n");
                                    res.write("</body></html>");
                                    res.end();
                                    break;

                                case "/leave":
                                    res.writeHead(200, {'Content-Type': 'text/plain'});
                                    // Inform our successor of it's now predecessor
                                    var payload = {
                                        "pre": chord_node.predecessor
                                    };
                                    notify_new_neighbour(chord_node.successor.port, payload, function()
                                    {
                                        // Inform our predecessor of it's now successor
                                        var payload = {
                                            "suc": chord_node.successor
                                        };
                                        notify_new_neighbour(chord_node.predecessor.port, payload, function()
                                        {
                                            // We're out of the loop!
                                            res.write("Left the Chord Ring successfully!");
                                            res.end();

                                            console.warn("Left the Chord ring!");
                                            console.warn("Terminating");
                                            process.exit(1);
                                        });
                                    });
                                    break;

                                case "/find_successor":
                                    var id = query.id;
                                    res.writeHead(200, {'Content-Type': 'application/json'});
                                    find_successor(id, function(ma)
                                    {
                                        console.info("ma------");
                                        console.info(ma);
                                        console.info("------ma");
                                        res.write(JSON.stringify(ma));
                                        res.end();
                                    });
                                    break;
                                    /*
                                     case "/delay":
                                         res.writeHead(200, {'Content-Type': 'application/json'});
                                         // Note: Piece of shit works
                                         setTimeout(function()
                                         {
                                             res.write(JSON.stringify(chord_node));
                                             res.end();
                                             }, 5000);
                                             break;
                                             */
                                             /*
                                              // JSON Send the entire chord_node
                                          case "/all":
                                              res.writeHead(200, {'Content-Type': 'application/json'});
                                              res.write(JSON.stringify(chord_node));
                                              res.end();
                                              break;
                                              */
                                              /*
                                               // XXX: Two below; Required for the render, but the render should use the above
                                               // XXX: Also it should be switchable (aka. enable render-mode)
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
                                               */

                                               // JSON join (find_join_successor) query
                                           case "/join":
                                               // TODO: Use find_successor, ask successor for predecessor and update them
                                               // NOTE: The above will remove the need for find_join_successor
                                               var info = JSON.parse(query.info);
                                               res.writeHead(200, {'Content-Type': 'application/json'});
                                               res.write(JSON.stringify(find_join_successor(info)));
                                               res.end();
                                               break;

                                               // JSON notify query (i.e. update your successor or predecessor)
                                           case "/notify":
                                               var info = JSON.parse(query.info);
                                               // Update pre
                                               if(info.pre !== undefined)
                                               {
                                                   console.warn("New predecessor");
                                                   chord_node.predecessor = info.pre;
                                               }
                                               // Update suc
                                               if(info.suc !== undefined)
                                               {
                                                   console.warn("New successor");
                                                   chord_node.successor = info.suc;
                                               }
                                               // Went well
                                               res.writeHead(200, {'Content-Type': 'text/plain'});
                                               res.write("SUCCES!");
                                               res.end();
                                               break;

                                           default:
                                               res.writeHead(404, {'Content-Type': 'text/plain'});
                                               res.write("No such page!");
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
            chord_node.info.ip = ip_to_string(address.address);
            chord_node.info.port = address.port;

            // If we're the main node, setup the successor as ourself
            if(address.port === main_node_port)
            {
                chord_node.predecessor = undefined;
                chord_node.successor = chord_node.info;
                //console.info(chord_node.successor)
            }
            else // If not the main node, join the ring here
            {
                console.info("Trying to join Chord ring:");
                chord_join(main_node_port);
            }
        });
    }


    function find_successor(id, callback)
    {
        function try_next_door(next_door)
        {
            // Setup the HTTP request
            var options = {
                host: 'localhost',
                port: next_door,
                path: '/find_successor?id=' + id
            };
            // ... and fire!
            http.get(options, function(res)
            {
                console.log("Got response code: " + res.statusCode);
                res.on("data", function(chunk)
                {
                    console.log("Got response: " + chunk);
                    var object = JSON.parse(chunk);
                    callback(object);
                });
            }).on('error', function(e)
            {
                console.error("Error while joining Chord ring: " + e.message);
                console.error("Terminating");
                process.exit(1);
            });
        }

        function isBetweenRightIncluded()
        {
            var key1 = chord_node.info.id;
            var key2 = chord_node.successor.id;

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
            // Tell the node, who it is in between
            callback({
                "pre": chord_node.info,
                "suc": chord_node.info
            });
        }
        else
        {
            var in_between = isBetweenRightIncluded();
            if(in_between)
            {
                // Tell the node, who it is in between
                callback({
                    "pre": chord_node.info,
                    "suc": chord_node.successor
                });
            }
            else
            {
                try_next_door(chord_node.successor.port);
            }
        }
    }

    function find_join_successor(info) : any
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
            chord_node.predecessor = info;
            // Tell the node, who it is in between
            return {
                "pre": chord_node.info,
                "suc": chord_node.info
            };
        }
        else
        {
            var in_between = isBetweenRightIncluded();
            if(in_between)
            {
                var old_successor = chord_node.successor;
                chord_node.successor = info;
                // Tell the node, who it is in between
                return {
                    "pre": chord_node.info,
                    "suc": old_successor
                };
            }
            else
            {
                return try_next_door();
            }
        }
    }

    function notify_new_neighbour(inform_port, payload, callback)
    {
        // Setup the HTTP request
        var options = {
            host: 'localhost',
            port: inform_port,
            path: '/notify?info=' + JSON.stringify(payload)
        };
        // ... and fire!
        http.get(options, function(res)
        {
            console.log("Got response code: " + res.statusCode);
            res.on("data", function(chunk)
            {
                console.log("Got response: " + chunk);
                callback();
            });
        }).on('error', function(e)
        {
            console.error("Error while joining Chord ring: " + e.message);
            console.error("Terminating");
            process.exit(1);
        });
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
                if(object.suc != null)
                {
                    chord_node.successor = object.suc;
                    chord_node.predecessor = object.pre;

                    var payload = {
                        "pre": chord_node.info
                    };
                    notify_new_neighbour(chord_node.successor.port, payload, function()
                    {
                        console.log("Successfully joined the Chord ring");
                    });
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
}


