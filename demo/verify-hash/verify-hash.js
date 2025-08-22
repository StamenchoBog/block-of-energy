const crypto = require('crypto');
const fs = require('fs');

/**
 * Calculates the SHA256 hash of a file's content.
 * @param {string} filePath The path to the file.
 * @returns {string} The SHA256 hash in hex format.
 */
function getHashOfFile(filePath) {
    const fileContent = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileContent).digest('hex');
}

if (process.argv.length < 3) {
    console.log("Usage: node verify-hash.js <path_to_message_file>");
    process.exit(1);
}

const filePath = process.argv[2];

try {
    const hash = getHashOfFile(filePath);
    console.log(`SHA256 Hash: ${hash}`);
} catch (error) {
    console.error(`Error reading or hashing file: ${error.message}`);
}
