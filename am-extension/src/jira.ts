import * as dotenv from 'dotenv';
import * as path from 'path';
import * as vscode from 'vscode';

export class JiraClient {
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
}
