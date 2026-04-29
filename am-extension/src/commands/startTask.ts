import * as vscode from 'vscode';
import { JiraService } from '../services/jiraService';
import { GitService } from '../services/gitService';
import { TaskContextService } from '../services/taskContextService';
import { getOutputChannel } from '../ui/outputChannel';

export async function startTaskCommand() {
    const outputChannel = getOutputChannel();
    try {
        const taskCode = await vscode.window.showInputBox({
            prompt: 'Enter Jira Task Code (e.g. CAPP-2259)',
            placeHolder: 'Task Code'
        });

        if (!taskCode) return;

        vscode.window.showInformationMessage(`AM: Fetching Jira ticket ${taskCode}...`);

        const jiraService = new JiraService();
        const issue = await jiraService.getIssue(taskCode);
        
        const targetProjects = jiraService.extractTargetProjects(issue);

        if (targetProjects.size > 0) {
            vscode.window.showInformationMessage(`AM: Preparing git branches for ${targetProjects.size} projects...`);
            const gitService = new GitService();
            await gitService.setupBranchForProjects(targetProjects, taskCode);
        } else {
            vscode.window.showWarningMessage(`No target projects found in Jira description!`);
        }

        vscode.window.showInformationMessage(`AM: Generating Task Context...`);

        const taskContextService = new TaskContextService();
        await taskContextService.generateTaskContext(taskCode, targetProjects, issue);

        vscode.window.showInformationMessage(`AM: Task Ready! Tell Antigravity to execute.`);

    } catch (error: any) {
        outputChannel.appendLine(`[Error] Top level execution error: ${error.message}`);
        if (error.stack) outputChannel.appendLine(`[Stack] ${error.stack}`);
        outputChannel.show();
        vscode.window.showErrorMessage(`AM Error: ${error.message}. Check Output channel.`);
    }
}
