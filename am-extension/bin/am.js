#!/usr/bin/env node
const { exec } = require('child_process');

const args = process.argv.slice(2);
const command = args[0];

if (command === 'startTask') {
    console.log("Starting AM Task in Antigravity...");
    exec("antigravity --open-url vscode://karson.am-extension/startTask", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return;
        }
    });
} else {
    console.error("Unknown command. Available commands: startTask");
    console.error("Usage: am startTask");
    process.exit(1);
}
