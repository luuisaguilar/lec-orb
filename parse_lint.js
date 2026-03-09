/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
let text = fs.readFileSync('lint_output.txt', 'utf16le');
// Some powershell versions output as UTF16 LE. Let's try converting it 
// and stripping potential ANSI escape codes
const stripped = text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
fs.writeFileSync('lint_parsed.txt', stripped, 'utf8');
console.log("Done.");
