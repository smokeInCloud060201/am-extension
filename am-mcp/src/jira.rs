use anyhow::{Context, Result};
use reqwest::Client;
use serde_json::Value;

pub struct JiraClient {
    client: Client,
    base_url: String,
    email: String,
    api_token: String,
}

impl JiraClient {
    pub fn new(base_url: String, email: String, api_token: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
            email,
            api_token,
        }
    }

    pub async fn get_issue(&self, issue_key: &str) -> Result<Value> {
        let url = format!("{}/rest/api/3/issue/{}", self.base_url, issue_key);
        let resp = self
            .client
            .get(&url)
            .basic_auth(&self.email, Some(&self.api_token))
            .header("Accept", "application/json")
            .send()
            .await
            .context("Failed to send request to Jira")?;

        if !resp.status().is_success() {
            anyhow::bail!("Jira API returned error status: {}", resp.status());
        }

        let body: Value = resp.json().await.context("Failed to parse Jira response")?;
        Ok(body)
    }
}
