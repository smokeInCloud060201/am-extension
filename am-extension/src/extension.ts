import * as vscode from 'vscode';
import { JiraClient } from './jira';
import { exec } from 'child_process';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';

const execAsync = util.promisify(exec);

class AmUriHandler implements vscode.UriHandler {
    handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
        if (uri.path === '/startTask') {
            vscode.commands.executeCommand('am.startTask');
        } else if (uri.path === '/reloadWindow') {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Agent Management extension is now active!');
    
    context.subscriptions.push(vscode.window.registerUriHandler(new AmUriHandler()));

    // Create an output channel for debugging
    const outputChannel = vscode.window.createOutputChannel('Agent Management');
    context.subscriptions.push(outputChannel);
    outputChannel.appendLine('Agent Management extension activated.');

    // Create a status bar item for quick access
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'am.startTask';
    statusBarItem.text = '$(play) Start AM Task';
    statusBarItem.tooltip = 'Start an Agent Management Task';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    let disposable = vscode.commands.registerCommand('am.startTask', async () => {
        try {
            const taskCode = await vscode.window.showInputBox({
                prompt: 'Enter Jira Task Code (e.g. CAPP-2259)',
                placeHolder: 'Task Code'
            });

            if (!taskCode) return;

            vscode.window.showInformationMessage(`AM: Fetching Jira ticket ${taskCode}...`);

            const jiraClient = new JiraClient();
            const issue = await jiraClient.getIssue(taskCode);
            
            const descJson = JSON.stringify(issue.fields?.description || {});
            
            // Extract projects matching `In [ProjectName]` or `- project-name:`
            const re1 = /In \[([a-zA-Z0-9_-]+)\]/g;
            const re2 = /- ([a-z0-9-]+):/g;
            
            const targetProjects = new Set<string>();
            
            let match;
            while ((match = re1.exec(descJson)) !== null) {
                targetProjects.add(match[1]);
            }
            while ((match = re2.exec(descJson)) !== null) {
                targetProjects.add(match[1]);
            }

            const projectsList = targetProjects.size === 0 
                ? "None found" 
                : Array.from(targetProjects).join('\n- ');

            if (targetProjects.size > 0) {
                vscode.window.showInformationMessage(`AM: Preparing git branches for ${targetProjects.size} projects...`);
                
                const workspaceFolders = vscode.workspace.workspaceFolders;
                const activeWorkspaceRoot = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : '';
                
                const workspaceRootStr = process.env.WORKSPACE_PATH || '../../company';
                // If it's an absolute path, use it. Otherwise, resolve relative to active workspace.
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
                        outputChannel.show(); // Bring the output channel to front on error
                        vscode.window.showErrorMessage(`Failed git setup for ${project}. Check 'Agent Management' output channel for details.`);
                    }
                }
            } else {
                vscode.window.showWarningMessage(`No target projects found in Jira description!`);
            }

            vscode.window.showInformationMessage(`AM: Generating Task Context...`);

            const workspaceFolders = vscode.workspace.workspaceFolders;
            const activeWorkspaceRoot = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : '';
            
            const outputDir = path.join(activeWorkspaceRoot, '_bmad-output');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            const taskFile = path.join(outputDir, 'current-task.md');

            const content = `# Task: ${taskCode}\n\n## Target Projects Detected:\n- ${projectsList}\n\n## SYSTEM PROMPT INSTRUCTIONS\nYou are Antigravity, executing the AM Workflow. You must follow these steps strictly:\n\n### STEP 2: Parse Context\nRead the raw Jira Description JSON at the bottom of this file. Focus heavily on the \`[AGENT]\` section if it exists. Intelligently extract and write out:\n1. **Problem**\n2. **Required Work**\n3. **Expected Outcome**\n\n### STEP 3: Question & Research Loop\nIf you have any questions or ambiguity regarding the architecture, requirements, or dependencies:\n- Use your tools to search Jira and Confluence.\n- If unresolved, ask the human.\n- Do NOT proceed to Step 5 until all ambiguity is resolved.\n\n### STEP 5: Implement Solution\nImplement the code across the Target Projects listed above.\n\n### STEP 6: Antigravity Code Review\nOnce implemented, review your own code for edge cases, performance, and best practices. Fix any issues found.\n\n### STEP 8: Iteration\nIf the Human reviewer tells you the code is NOT good, update the code and repeat the review.\n\n---\n\n## Jira Raw Description JSON\n${descJson}`;

            fs.writeFileSync(taskFile, content);

            // Open the file in the editor automatically
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(taskFile));
            await vscode.window.showTextDocument(document);

            vscode.window.showInformationMessage(`AM: Task Ready! Tell Antigravity to execute.`);

        } catch (error: any) {
            outputChannel.appendLine(`[Error] Top level execution error: ${error.message}`);
            if (error.stack) outputChannel.appendLine(`[Stack] ${error.stack}`);
            outputChannel.show();
            vscode.window.showErrorMessage(`AM Error: ${error.message}. Check Output channel.`);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
