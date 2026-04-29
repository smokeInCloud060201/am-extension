use anyhow::{Context, Result};
use reqwest::Client;
use serde_json::Value;
use tracing::{debug, error};

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
        debug!("HTTP GET {}", url);
        let resp = self
            .client
            .get(&url)
            .basic_auth(&self.email, Some(&self.api_token))
            .header("Accept", "application/json")
            .send()
            .await
            .context("Failed to send request to Jira")?;

        if !resp.status().is_success() {
            error!("Jira API Error {}: {}", url, resp.status());
            anyhow::bail!("Jira API returned error status: {}", resp.status());
        }

        debug!("Jira API returned success");
        let body: Value = resp.json().await.context("Failed to parse Jira response")?;
        Ok(body)
    }

    pub async fn search_confluence(&self, cql_query: &str) -> Result<Value> {
        // Confluence API v1 search endpoint
        let url = format!(
            "{}/wiki/rest/api/content/search?cql={}&expand=body.storage",
            self.base_url,
            urlencoding::encode(cql_query)
        );

        debug!("HTTP GET {}", url);
        let resp = self
            .client
            .get(&url)
            .basic_auth(&self.email, Some(&self.api_token))
            .header("Accept", "application/json")
            .send()
            .await
            .context("Failed to send request to Confluence")?;

        if !resp.status().is_success() {
            error!("Confluence API Error {}: {}", url, resp.status());
            anyhow::bail!("Confluence API returned error status: {}", resp.status());
        }

        debug!("Confluence API returned success");
        let body: Value = resp.json().await.context("Failed to parse Confluence response")?;
        Ok(body)
    }
}
