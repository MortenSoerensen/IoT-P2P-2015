var spawn = require('child_process').spawn;
var sleep = require('sleep');

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
// Start spawning nodes
var main_node = null;
if(nodes >= 1)
{
    main_node = spawn('node', ["Chord.js", "main_node"]);
    /*
    main_node.stdout.on('data', function(data) {
        console.log(data.toString());
    });
    main_node.stderr.on('data', function(data) {
        console.log(data.toString());
    });
    */
}

var default_nodes = [];
for (var i = 0; i < nodes - 1; i++)
{
    var node = spawn('node', ['Chord.js', 'node']);
    console.info((i + 2) + " nodes spawned");
    sleep.sleep(2);
    default_nodes.push(node);
}

var readline = require('readline');
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', function(line)
{
    if(line == "kill")
    {
        for (var i = 0; i < default_nodes.length; i++)
        {
            default_nodes[i].kill();
        }
        main_node.kill();
        process.exit(0);
    }
    else
    {
        console.warn("No such command: " + line);
    }
})
