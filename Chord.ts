// Disclaimer: Everything needs to run on the same ip/machine
//              --> NOTE: Easily fixable
//
// MISSING:
// * Bonus: Gør jeres ring robust over churn v.hj.a. successorlister.

/// <reference path='IChord.ts'/>

// Declare the nodejs require function
declare function require(name : string);

var http = require('http');
var url  = require('url');

class Chord implements IChord
{
    // Information object about this chord node
    protected info : NodeInfo;
    protected successor : NodeInfo;
    protected predecessor : NodeInfo;

    // HTML template
    private template_string : string;

    constructor()
    {
        var _this = this;
        // Setup the node info struct
        _this.info = new NodeInfo();
        // Pre-load the html template
        var fs = require('fs')
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

    public handler(url_parts : string, path_name : string, query : any, res : any)
    {
        var _this = this;
        switch(path_name)
        {
            // Browser html info page
        case "/":
            var data = _this.template_string;
            data = data.replace(/%%ID%%/g, _this.info.id);
            data = data.replace(/%%IP%%/g, _this.info.ip);
            data = data.replace(/%%PORT%%/g, _this.info.port.toString());

            data = data.replace(/%%SUCC-IP%%/g, _this.successor.ip);
            data = data.replace(/%%SUCC-PORT%%/g, _this.successor.port.toString());

            data = data.replace(/%%PRED-IP%%/g, _this.predecessor.ip);
            data = data.replace(/%%PRED-PORT%%/g, _this.predecessor.port.toString());

            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(data);
            res.end();
            break;

        case "/leave":
            res.writeHead(200, {'Content-Type': 'text/plain'});
            // Inform our successor of it's now predecessor
            var payload : TransferNodePair = {
                predecessor: _this.predecessor,
                successor: undefined
            };
            _this.notify_new_neighbour(_this.successor.port, payload, function()
            {
                // Inform our predecessor of it's now successor
                var payload : TransferNodePair = {
                    predecessor: undefined,
                    successor: _this.successor
                };
                _this.notify_new_neighbour(_this.predecessor.port, payload, function()
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
            _this.find_successor_server(id, function(suc : NodeInfo)
            {
                console.warn(suc);
                res.write(JSON.stringify(suc));
                res.end();
            });
            break;

        case "/find_neighbours":
            var id = query.id;
            res.writeHead(200, {'Content-Type': 'application/json'});
            _this.find_neighbours_server(id, function(pair : TransferNodePair)
            {
                res.write(JSON.stringify(pair));
                res.end();
            });
            break;

            // JSON notify query (i.e. update your successor or predecessor)
        case "/notify":
            var info : TransferNodePair = JSON.parse(decodeURIComponent(query.info));
            // Update pre
            if(info.predecessor !== undefined)
            {
                console.warn("New predecessor");
                _this.predecessor = info.predecessor;
            }
            // Update suc
            if(info.successor !== undefined)
            {
                console.warn("New successor");
                _this.successor = info.successor;
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
    }

    public run(host_port : number, handler_override : any) : void
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

            if(handler_override != undefined)
            {
                handler_override(url_parts, path_name, query, res);
            }
            else
            {
                _this.handler(url_parts, path_name, query, res);
            }
        });
        // Start the server!
        server.listen(port, function()
        {
            // Inform the allocated port
            var address = server.address();
            address.address = "localhost"; //TODO; temporary fix that works for localhost only
            console.log("Running Chord node at port: " + address.port);

            // Calculate the node id
            var server_address_string = address.address + ":" + address.port;
            console.info("Full server address: " + server_address_string);
            var node_id = utils.hash_string(server_address_string);
            console.info("Node has id: " + node_id);
            // Assign the node id
            _this.info.id = node_id;
            _this.info.ip = utils.ip_to_string(address.address);
            _this.info.port = address.port;

            // If we're the main node, setup the successor as ourself
            if(address.port === main_node_port)
            {
                _this.predecessor = _this.info;
                _this.successor = _this.info;
                console.info("Main node online!");
            }
            else // If not the main node, join the ring here
            {
                console.info("Trying to join Chord ring:");
                _this.chord_join(main_node_port, function(){
                    console.log("Successfully joined the Chord ring");
                });
            }
        });
    }

    private find_successor_server(id : string, callback : (NodeInfo) => void)
    {
        this.find_neighbours_server(id, function(object : TransferNodePair)
        {
            callback(object.successor);
        });
    }

    protected find_neighbours_server(id: string, callback : (TransferNodePair) => void)
    {
        // 1 node ring case
        if(this.info === this.successor)
        {
            // Tell the node, who it is in between
            var payload : TransferNodePair = {
                predecessor: this.info,
                successor: this.info
            };
            callback(payload);
        }
        else // general case
        {
            var in_between : boolean = utils.is_between_cyclic(id, this.info.id, this.successor.id);
            if(in_between) // In our area of responsability
            {
                // Tell the node, who it is in between
                var payload : TransferNodePair = {
                    predecessor: this.info,
                    successor: this.successor
                };
                callback(payload);
            }
            else // Not in our area, ask our successor to handle it
            {
                this.find_neighbours(id, this.successor.port, callback);
            }
        }
    }

    public find_successor(id : string, port : number, callback : (NodeInfo) => void)
    {
        this.find_neighbours(id, port, function(object : TransferNodePair)
        {
            callback(object.successor);
        });
    }

    public find_neighbours(id: string, port : number, callback : (TransferNodePair) => void)
    {
        // Setup the HTTP request
        var options = {
            host: 'localhost',
            port: port,
            path: '/find_neighbours?id=' + id
        };
        // ... and fire!
        http.get(options, function(res)
        {
            console.log("Got response code: " + res.statusCode);
            res.on("data", function(chunk)
            {
                console.log("Got response: " + chunk);
                var object : TransferNodePair = JSON.parse(chunk);
                callback(object);
            });
        }).on('error', function(e)
        {
            console.error("Error while finding neighbours: " + e.message);
            console.error("Terminating");
            process.exit(1);
        });
    }

    private notify_new_neighbour(inform_port : number, payload : TransferNodePair, callback : () => void)
    {
        // Setup the HTTP request
        var options = {
            host: 'localhost',
            port: inform_port,
            path: '/notify?info=' + encodeURIComponent(JSON.stringify(payload))
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
            console.error("Error while joining notifying neighbour: " + e.message);
            console.error("Terminating");
            process.exit(1);
        });
    }

    // Function to join the Chord ring, via the known main node
    protected chord_join(join_port : number, callback : () => void) : void
    {
        var _this = this;

        this.find_neighbours(this.info.id, join_port, function(object : TransferNodePair)
        {
            _this.successor = object.successor;
            _this.predecessor = object.predecessor;

            // XXX: Consider using Q instead of layer coding
            var payload : TransferNodePair = {
                predecessor: _this.info,
                successor: undefined
            };
            _this.notify_new_neighbour(_this.successor.port, payload, function()
            {
                var payload : TransferNodePair = {
                    predecessor: undefined,
                    successor: _this.info
                };
                _this.notify_new_neighbour(_this.predecessor.port, payload, function()
                {
                   // console.log("Successfully joined the Chord ring");
                   callback();
                });
            });
        });
    }
}

