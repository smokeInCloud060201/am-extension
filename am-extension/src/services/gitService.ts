import { exec } from 'child_process';
import * as util from 'util';
import * as path from 'path';
import * as vscode from 'vscode';
import { getOutputChannel } from '../ui/outputChannel';

const execAsync = util.promisify(exec);

export class GitService {
    public async setupBranchForProjects(targetProjects: Set<string>, taskCode: string): Promise<void> {
        const outputChannel = getOutputChannel();
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const activeWorkspaceRoot = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : '';
        
        const workspaceRootStr = process.env.WORKSPACE_PATH || '../../company';
        const finalWorkspacePath = path.isAbsolute(workspaceRootStr) 
            ? workspaceRootStr 
            : path.resolve(activeWorkspaceRoot, workspaceRootStr);
        
        for (const project of targetProjects) {
            const projectPath = path.resolve(finalWorkspacePath, project);
            outputChannel.appendLine(`[Git] Preparing project: ${project} at ${projectPath}`);
            try {
                const { stdout, stderr } = await execAsync(`git checkout master && git fetch && git pull origin master && (git checkout ${taskCode} || git checkout -b ${taskCode})`, { cwd: projectPath });
                outputChannel.appendLine(`[Git] Success for ${project}:\n${stdout}`);
                if (stderr) outputChannel.appendLine(`[Git] Stderr for ${project}:\n${stderr}`);
            } catch (error: any) {
                outputChannel.appendLine(`[Git Error] Failed to setup ${project} at ${projectPath}`);
                outputChannel.appendLine(`Message: ${error.message}`);
                outputChannel.appendLine(`Stdout: ${error.stdout || 'None'}`);
                outputChannel.appendLine(`Stderr: ${error.stderr || 'None'}`);
                outputChannel.show();
                vscode.window.showErrorMessage(`Failed git setup for ${project}. Check 'Agent Management' output channel for details.`);
            }
        }
    }
}
