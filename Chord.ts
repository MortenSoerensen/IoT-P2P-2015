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
var fs   = require('fs')
var crypto = require('crypto');

class node
{
    // Information object about this chord node
    private chord_node : any;
    private template_string : string;

    constructor()
    {
        var _this = this;
        _this.chord_node = {};

        fs.readFile('template.html', 'utf8', function (err, data)
        {
            if (err)
            {
                console.error("Error loading html template: " + err);
                console.error("Terminating");
                process.exit(1);
            }
            _this.template_string = data;
        });
    }

    private ip_to_string(ip : string) : string
    {
        if(ip === "0.0.0.0")
            return "localhost";
        else
            return ip;
    }

    run(host_port : number) : void
    {
        var _this = this;
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
                var data = _this.template_string;
                data = data.replace("%%ID%%", _this.chord_node.info.id);
                data = data.replace("%%IP%%", _this.chord_node.info.ip);
                data = data.replace("%%PORT%%", _this.chord_node.info.port);

                data = data.replace("%%SUCC-IP%%", _this.chord_node.successor.ip);
                data = data.replace("%%SUCC-PORT%%", _this.chord_node.successor.port);

                if(_this.chord_node.predecessor !== undefined)
                {
                    data = data.replace("%%PRED-IP%%", _this.chord_node.predecessor.ip);
                    data = data.replace("%%PRED-PORT%%", _this.chord_node.predecessor.port);
                }
                else // is undefined
                {
                    data = data.replace("%%PRED-IP%%", _this.chord_node.info.ip);
                    data = data.replace("%%PRED-PORT%%", _this.chord_node.info.port);
                }

                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write(data);
                res.end();
                break;

            case "/leave":
                res.writeHead(200, {'Content-Type': 'text/plain'});
                // Inform our successor of it's now predecessor
                var payload = {
                    "pre": _this.chord_node.predecessor
                };
                _this.notify_new_neighbour(_this.chord_node.successor.port, payload, function()
                {
                    // Inform our predecessor of it's now successor
                    var payload = {
                        "suc": _this.chord_node.successor
                    };
                    _this.notify_new_neighbour(_this.chord_node.predecessor.port, payload, function()
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
                _this.find_successor(id, function(ma)
                {
                    console.info("ma------");
                    console.info(ma);
                    console.info("------ma");
                    res.write(JSON.stringify(ma));
                    res.end();
                });
                break;
                /*
                      // JSON Send the entire this.chord_node
                      case "/all":
                          res.writeHead(200, {'Content-Type': 'application/json'});
                          res.write(JSON.stringify(this.chord_node));
                          res.end();
                          break;

                       // XXX: Two below; Required for the render, but the render should use the above
                       // XXX: Also it should be switchable (aka. enable render-mode)
                       // JSON id query
                       case "/id":
                           res.writeHead(200, {'Content-Type': 'application/json'});
                           res.write(JSON.stringify(this.chord_node.info));
                           res.end();
                           break;

                       // JSON successor query
                       case "/successor":
                           res.writeHead(200, {'Content-Type': 'application/json'});
                           res.write(JSON.stringify(this.chord_node.successor));
                           res.end();
                           break;
                    */
                    /*
                        // JSON join (find_join_successor) query
                       case "/join":
                           // TODO: Use find_successor, ask successor for predecessor and update them
                           // NOTE: The above will remove the need for find_join_successor
                           var info = JSON.parse(query.info);
                           res.writeHead(200, {'Content-Type': 'application/json'});
                           res.write(JSON.stringify(_this.find_join_successor(info)));
                           res.end();
                           break;
                    */
                        // JSON notify query (i.e. update your successor or predecessor)
                       case "/notify":
                           var info = JSON.parse(query.info);
                           // Update pre
                           if(info.pre !== undefined)
                           {
                               console.warn("New predecessor");
                               _this.chord_node.predecessor = info.pre;
                           }
                           // Update suc
                           if(info.suc !== undefined)
                           {
                               console.warn("New successor");
                               _this.chord_node.successor = info.suc;
                           }
                           // Went well
                           res.writeHead(200, {'Content-Type': 'text/plain'});
                           res.write("SUCCES!");
                           res.end();
                           break;

                       default:
                           res.writeHead(404, {'Content-Type': 'text/plain'});
                           res.write("No such page! - " + path_name);
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
            _this.chord_node.info = {};
            _this.chord_node.info.id = node_id;
            _this.chord_node.info.ip = _this.ip_to_string(address.address);
            _this.chord_node.info.port = address.port;

            // If we're the main node, setup the successor as ourself
            if(address.port === main_node_port)
            {
                _this.chord_node.predecessor = undefined;
                _this.chord_node.successor = _this.chord_node.info;
                console.info("Main node online!");
                //console.info(_this.chord_node.successor)
            }
            else // If not the main node, join the ring here
            {
                console.info("Trying to join Chord ring:");
                _this.chord_join(main_node_port);
            }
        });
    }

    public find_successor(id, callback)
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

        var _this = this;

        function isBetweenRightIncluded()
        {
            var key1 = _this.chord_node.info.id;
            var key2 = _this.chord_node.successor.id;

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

        if(this.chord_node.info === this.chord_node.successor)
        {
            // Tell the node, who it is in between
            callback({
                "pre": this.chord_node.info,
                "suc": this.chord_node.info
            });
        }
        else
        {
            var in_between = isBetweenRightIncluded();
            if(in_between)
            {
                // Tell the node, who it is in between
                callback({
                    "pre": this.chord_node.info,
                    "suc": this.chord_node.successor
                });
            }
            else
            {
                try_next_door(this.chord_node.successor.port);
            }
        }
    }

    private notify_new_neighbour(inform_port, payload, callback)
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
    private chord_join(join_port)
    {
        var _this = this;
        // Setup the HTTP request
        var options = {
            host: 'localhost',
            port: join_port,
            path: '/find_successor?id=' + _this.chord_node.info.id
        };
        // ... and fire!
        http.get(options, function(res)
        {
            console.log("Got response code: " + res.statusCode);
            res.on("data", function(chunk)
            {
                console.log("Got response: " + chunk);
                var object = JSON.parse(chunk);
                _this.chord_node.successor = object.suc;
                _this.chord_node.predecessor = object.pre;

                var payload = {
                    "pre": _this.chord_node.info
                };
                _this.notify_new_neighbour(_this.chord_node.successor.port, payload, function()
                {
                    var payload = {
                        "suc": _this.chord_node.info
                    };
                    _this.notify_new_neighbour(_this.chord_node.predecessor.port, payload, function()
                    {
                        console.log("Successfully joined the Chord ring");
                    });
                });
            });
        }).on('error', function(e)
        {
            console.error("Error while joining Chord ring: " + e.message);
            console.error("Terminating");
            process.exit(1);
        });
    }
}

