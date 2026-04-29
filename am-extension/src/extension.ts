import * as vscode from 'vscode';
import { AmUriHandler } from './handlers/uriHandler';
import { getOutputChannel } from './ui/outputChannel';
import { createStatusBarItem } from './ui/statusBar';
import { startTaskCommand } from './commands/startTask';

export function activate(context: vscode.ExtensionContext) {
    console.log('Agent Management extension is now active!');
    
    // Register custom URI handler
    context.subscriptions.push(vscode.window.registerUriHandler(new AmUriHandler()));

    // Initialize output channel
    const outputChannel = getOutputChannel();
    context.subscriptions.push(outputChannel);
    outputChannel.appendLine('Agent Management extension activated.');

    // Initialize status bar item
    const statusBarItem = createStatusBarItem();
    context.subscriptions.push(statusBarItem);

    // Register commands
    let disposable = vscode.commands.registerCommand('am.startTask', startTaskCommand);
    context.subscriptions.push(disposable);
}

export function deactivate() {}
