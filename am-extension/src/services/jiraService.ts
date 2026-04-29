import * as dotenv from 'dotenv';
import * as path from 'path';
import * as vscode from 'vscode';

export class JiraService {
    private domain: string;
    private email: string;
    private apiToken: string;

    constructor() {
        // Load .env from workspace root
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspacePath = workspaceFolders[0].uri.fsPath;
            const envPath = path.join(workspacePath, '.env');
            dotenv.config({ path: envPath });
        } else {
            console.warn('No active workspace folder found to load .env');
        }

        this.domain = process.env.JIRA_DOMAIN || '';
        this.email = process.env.JIRA_EMAIL || '';
        this.apiToken = process.env.JIRA_API_TOKEN || '';

        if (!this.domain || !this.email || !this.apiToken) {
            throw new Error('Jira credentials are not fully configured in .env (make sure it exists in your workspace root)');
        }
    }

    public async getIssue(issueId: string): Promise<any> {
        const url = `${this.domain}/rest/api/3/issue/${issueId}`;
        const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch Jira issue: ${response.statusText}`);
        }

        return response.json();
    }

    public extractTargetProjects(issue: any): Set<string> {
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

        return targetProjects;
    }
}
