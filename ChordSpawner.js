var spawn = require('child_process').spawn;
var readline = require('readline');

// The number of nodes to spawn
var nodes = 0;

// Not enough arguments
if(process.argv.length <= 2)
{
    console.error("Not enough arguments provided!");
    console.info("Usage: node ChordSpawner.js number_of_nodes_to_spawn");
    return;
}
else // Enough arguments
{
    nodes = parseInt(process.argv[2]);
}
// Spawn the main node
if(nodes >= 1)
{
    // Spawn the main node
    var main_node = spawn('node', ["output/Driver.js", "main_node"]);
    // Print out any errors detected
    main_node.stderr.on('data', function(data) {
        console.log(data.toString());
    });

   readline.createInterface({
      input     : main_node.stdout,
      terminal  : false
    }).on('line', function(line) {
        if(line == "Main node online!")
        {
            // Main node is online!
            // Start spawning nodes
            start(0);
        }
    });
}
// Recursive spawner function
var start = function recurse(i)
{
    // Check if all nodes have been created
    if(i >= nodes - 1)
    {
        console.info("All nodes spawned!");
        return;
    }
    // Spawn a node
    var node = spawn('node', ['output/Driver.js', 'node']);
    //default_nodes.push(node);
    console.info((i + 2) + " nodes spawned");
    // Detect the joined message, before spawning another node
    readline.createInterface({
      input     : node.stdout,
      terminal  : false
    }).on('line', function(line) {
        if(line == "Successfully joined the Chord ring")
        {
            recurse(i+1);
        }
    });
    // Print out any errors detected
    node.stderr.on('data', function(data) {
        console.error(data.toString());
    });
}
