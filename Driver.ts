/// <reference path='utils.ts'/>
/// <reference path='Chord.ts'/>
/// <reference path='FingerChord.ts'/>
/// <reference path='RenderChord.ts'/>

declare var process : any;

// The port to host the server at
var port : number;
// The main_node (known to be running) port
var main_node_port : number = 8080;

// Not enough arguments
if(process.argv.length <= 2)
{
    console.error("Not enough arguments provided!");
    console.info("Usage: node Chord.js (main_node | node)");
    process.exit(1);
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
        process.exit(1);
    }
}

var n = new RenderChord<FingerChord>(new FingerChord());
n.run(port);
