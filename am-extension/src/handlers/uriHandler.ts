import * as vscode from 'vscode';

export class AmUriHandler implements vscode.UriHandler {
    handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
        switch (uri.path) {
            case '/startTask':
                vscode.commands.executeCommand('am.startTask');
                break;
            case '/reloadWindow':
                vscode.commands.executeCommand('workbench.action.reloadWindow');
                break;
            default:
                console.warn(`Unhandled URI path: ${uri.path}`);
                break;
        }
    }
}
