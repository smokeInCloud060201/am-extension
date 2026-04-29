import * as vscode from 'vscode';

export function createStatusBarItem(): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'am.startTask';
    statusBarItem.text = '$(play) Start AM Task';
    statusBarItem.tooltip = 'Start an Agent Management Task';
    statusBarItem.show();
    return statusBarItem;
}
