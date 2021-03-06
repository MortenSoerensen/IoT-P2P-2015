/// <reference path='Chord.ts'/>

class FingerChord extends Chord
{
    static fingertableSize : number = 20;
    static fingertableSpan : number = Math.pow(2, (FingerChord.fingertableSize));
    private fingertable : Array<NodeInfo>;

    constructor()
    {
        super();
        var _this = this;
        console.warn("FingerChord");  

        this.fingertable = Array<NodeInfo>(3);

        // Pre-load the html template
        var fs = require('fs')
        fs.readFile('template-finger.html', 'utf8', function (err, data)
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

    // TODO: Graceful leave

    public handler(url_parts : string, path_name : string, query : any, res : any)
    {
        if(path_name === "/update_finger")
        {
            function get_successor(port, callback)
            {
                // Setup the HTTP request
                var options = {
                    host: 'localhost',
                    port: port,
                    path: '/suc'
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
                    console.error("Error while calling get_predecessor: " + e.message);
                    console.error("Terminating");
                    process.exit(1);
                });
            }
            var _this = this;
            var checkForTableExpansion = function recursive_suc(nodesVisited : number, current: NodeInfo, callback : () => void)
            {
                for(var i=1;i<=FingerChord.fingertableSize;i++)
                {
                    var l = Math.pow(2,i);
                    if(nodesVisited == l)
                    {
                        _this.fingertable[i-1] = current;
                    }
                }
                if(nodesVisited === FingerChord.fingertableSpan)
                {
                    console.log("Done updating fingertable.");
                    callback();
                    return;
                }
                else
                {
                    // Get the successor of current, and recurse on that
                    get_successor(current.port, function(successor: NodeInfo)
                    {
                        if(successor.port === _this.info.port)
                        {
                            console.log("Reached the current node, fingertable updated.");
                            callback();
                            return;
                        }

                        //build initial table, check for port?
                        recursive_suc(nodesVisited+1, successor, callback);
                    });
                }
            }
            // NOTE: Should probably take an id of the inserted node as url argument
            // XXX: var insertID = query['insertID']
            function update_finger_worker(callback : () => void)
            {
                // TODO: Update the finger table:
                //
                // XXX: Loop through the fingers, find the insertion spot,
                //      i.e. between which fingers the new node was inserted.
                //for(var i = 0; i <= fingertableSize; i++){

                //    if(this.info.id > insertID) {
                //        this.fingertable[i] = get_predecessor("port of inserted node", callback);
                //    }

                //} //is our fingertable full now?
                //if yes, return;

                //go to the current nodes last finger entry
                //var lastfinger : NodeInfo = fingertable[fingertable.length-1].info;
                checkForTableExpansion(0, _this.info, callback);
                //call suc recursively until you meet your own node (if so, the table should not be expanded), if you reach
                //a "fingertablespan" amount of suc iterations, the reached node is now the next fingertable entry and the fingertablesize has increased by one


                // XXX: Update all the ones after the insertion spot with +1
                //      i.e. go to the finger, and find it predecessor, it's the new finger.
                // XXX: Check if our finger table is filled, if so return now.
                // XXX: Check if there's enough additional nodes to extend our finger table.
                //      i.e. by doing a linear search forward.
                // XXX: Call callback when everything is done
            }

            //setInterval(function() { update_finger_worker(function() {});}, 10000);

            res.writeHead(200, {'Content-Type': 'text/plain'});
            // Update the finger table, and respond when done
            update_finger_worker(function()
            {
                res.write("SUCCES!");
                res.end();
            });
        }
        else if(path_name === "/pre")
        {
            res.writeHead(200, {'Content-Type': 'application/JSON'});
            res.write(JSON.stringify(this.predecessor));
            res.end();
        }
        else if(path_name === "/suc")
        {
            res.writeHead(200, {'Content-Type': 'application/JSON'});
            res.write(JSON.stringify(this.successor));
            res.end();
        }
        else if(path_name === "/get_fingertable")
        {
            res.writeHead(200, {'Content-Type': 'application/JSON'});
            res.write(JSON.stringify(this.fingertable));
            res.end();
        }
        else
        {
            super.handler(url_parts, path_name, query, res);
        }
    }

    protected find_neighbours_server(id: string, callback : (TransferNodePair) => void)
    {
        if((this.info === this.successor) || (utils.is_between_cyclic(id, this.info.id, this.successor.id)))
        {
            super.find_neighbours_server(id, callback);
        }
        else
        {
            var lookup : Array<NodeInfo> = Array(FingerChord.fingertableSize+1);
            lookup[0] = this.successor;
            for(var i=0;i<FingerChord.fingertableSize;i++)
            {
                lookup[1+i] = this.fingertable[i];
            }
            for(var i=0;;i++)
            {
                if(lookup[i+1] === null || lookup[i+1] === undefined)
                {
                    ChordHelper.find_neighbours(id, lookup[i].port, callback);
                    break;
                }
                else if(utils.is_between_cyclic(id, lookup[i].id, lookup[i+1].id))
                {
                    ChordHelper.find_neighbours(id, lookup[i].port, callback);
                    break;
                }
            }
        }
    }

    // Function to join the Chord ring, via the known main node
    protected chord_join(join_port : number) : void
    {
        function invoke_update_finger(port, callback)
        {
            // Setup the HTTP request
            var options = {
                host: 'localhost',
                port: port,
                path: '/update_finger'
            };
            // ... and fire!
            http.get(options, function(res)
            {
                res.on("data", function(chunk)
                {
                    callback();
                });
            }).on('error', function(e)
            {
                console.error("Error while calling invoke_update_finger: " + e.message);
                console.error("Terminating");
                process.exit(1);
            });
        }

        function get_predecessor(port, callback)
        {
            // Setup the HTTP request
            var options = {
                host: 'localhost',
                port: port,
                path: '/pre'
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
                console.error("Error while calling get_predecessor: " + e.message);
                console.error("Terminating");
                process.exit(1);
            });
        }
        var _this = this;   
        var starter = function recursive_pred(nodesVisited : number, current: NodeInfo)
        {
            if(nodesVisited === FingerChord.fingertableSpan+1)
            {
                console.log("Successfully joined the Chord ring");
                return;
            }
            else
            {
                // Update the fingers of current
                invoke_update_finger(current.port, function()
                {
                    // Get the predecessor of current, and recurse on that
                    get_predecessor(current.port, function(predecessor: NodeInfo)
                    {
                        if(predecessor.port === _this.info.port)
                        {
                            console.log("Successfully joined the Chord ring");
                            return;
                        }
    
                        recursive_pred(nodesVisited+1, predecessor);
                    });
                });
            }
        }
        super.chord_join(join_port, function()
        {
            // Tell everyone before us to update their fingers
            starter(0, _this.info);
            // TODO: We need to build our own initial finger table
            // XXX: Ask someone for theirs, and use that to construct ours
            // is the finger table of the predecessor not
        });
    }
}
