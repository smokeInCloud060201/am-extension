"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const jira_1 = require("./jira");
const child_process_1 = require("child_process");
const path = require("path");
const util = require("util");
const fs = require("fs");
const execAsync = util.promisify(child_process_1.exec);
function activate(context) {
    console.log('Agent Management extension is now active!');
    let disposable = vscode.commands.registerCommand('am.startTask', async () => {
        try {
            const taskCode = await vscode.window.showInputBox({
                prompt: 'Enter Jira Task Code (e.g. CAPP-2259)',
                placeHolder: 'Task Code'
            });
            if (!taskCode)
                return;
            vscode.window.showInformationMessage(`AM: Fetching Jira ticket ${taskCode}...`);
            const jiraClient = new jira_1.JiraClient();
            const issue = await jiraClient.getIssue(taskCode);
            const descJson = JSON.stringify(issue.fields?.description || {});
            // Extract projects matching `In [ProjectName]` or `- project-name:`
            const re1 = /In \[([a-zA-Z0-9_-]+)\]/g;
            const re2 = /- ([a-z0-9-]+):/g;
            const targetProjects = new Set();
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
                const workspaceRoot = process.env.WORKSPACE_PATH || '../../company';
                const extensionRoot = path.join(__dirname, '../../');
                for (const project of targetProjects) {
                    const projectPath = path.resolve(extensionRoot, workspaceRoot, project);
                    try {
                        await execAsync(`git checkout master && git fetch && git pull origin master && git checkout -b ${taskCode}`, { cwd: projectPath });
                    }
                    catch (error) {
                        console.error(`Git error for ${project}:`, error);
                        vscode.window.showWarningMessage(`Failed git setup for ${project}`);
                    }
                }
            }
            else {
                vscode.window.showWarningMessage(`No target projects found in Jira description!`);
            }
            vscode.window.showInformationMessage(`AM: Generating Task Context...`);
            const outputDir = path.join(__dirname, '../../_bmad-output');
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`AM Error: ${error.message}`);
        }
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map