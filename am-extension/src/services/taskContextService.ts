import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class TaskContextService {
    public async generateTaskContext(taskCode: string, targetProjects: Set<string>, issue: any): Promise<void> {
        const descJson = JSON.stringify(issue.fields?.description || {});
        const projectsList = targetProjects.size === 0 
            ? "None found" 
            : Array.from(targetProjects).join('\n- ');

        const workspaceFolders = vscode.workspace.workspaceFolders;
        const activeWorkspaceRoot = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : '';
        
        const outputDir = path.join(activeWorkspaceRoot, '_bmad-output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const taskFile = path.join(outputDir, 'current-task.md');

        const content = `# Task: ${taskCode}\n\n## Target Projects Detected:\n- ${projectsList}\n\n## SYSTEM PROMPT INSTRUCTIONS\nYou are Antigravity, executing the AM Workflow. You must follow these steps strictly:\n\n### STEP 2: Parse Context\nRead the raw Jira Description JSON at the bottom of this file. Focus heavily on the \`[AGENT]\` section if it exists. Intelligently extract and write out:\n1. **Problem**\n2. **Required Work**\n3. **Expected Outcome**\n\n### STEP 3: Question & Research Loop\nIf you have any questions or ambiguity regarding the architecture, requirements, or dependencies:\n- Use your tools to search Jira and Confluence.\n- If unresolved, ask the human.\n- Do NOT proceed to Step 5 until all ambiguity is resolved.\n\n### STEP 5: Implement Solution\nImplement the code across the Target Projects listed above.\n\n### STEP 6: Antigravity Code Review\nOnce implemented, review your own code for edge cases, performance, and best practices. Fix any issues found.\n\n### STEP 8: Iteration\nIf the Human reviewer tells you the code is NOT good, update the code and repeat the review.\n\n---\n\n## Jira Raw Description JSON\n${descJson}`;

        fs.writeFileSync(taskFile, content);

        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(taskFile));
        await vscode.window.showTextDocument(document);
    }
}
