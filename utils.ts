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
