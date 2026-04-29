"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JiraClient = void 0;
const dotenv = require("dotenv");
const path = require("path");
// Load .env from workspace root if it exists
dotenv.config({ path: path.join(__dirname, '../../.env') });
class JiraClient {
    domain;
    email;
    apiToken;
    constructor() {
        this.domain = process.env.JIRA_DOMAIN || '';
        this.email = process.env.JIRA_EMAIL || '';
        this.apiToken = process.env.JIRA_API_TOKEN || '';
        if (!this.domain || !this.email || !this.apiToken) {
            throw new Error('Jira credentials are not fully configured in .env');
        }
    }
    async getIssue(issueId) {
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
exports.JiraClient = JiraClient;
//# sourceMappingURL=jira.js.map