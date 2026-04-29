use crate::protocol::*;
use crate::jira::JiraClient;
use anyhow::Result;
use tokio::io::{AsyncBufReadExt, BufReader, AsyncWriteExt};
use std::env;
use serde_json::json;
use tracing::{debug, error, info, warn};

pub async fn run_stdio_server() -> Result<()> {
    // Load .env file
    dotenvy::dotenv().ok();

    let jira_domain = env::var("JIRA_DOMAIN").unwrap_or_default();
    let jira_email = env::var("JIRA_EMAIL").unwrap_or_default();
    let jira_token = env::var("JIRA_API_TOKEN").unwrap_or_default();

    let jira_client = JiraClient::new(jira_domain, jira_email, jira_token);

    let stdin = tokio::io::stdin();
    let mut stdout = tokio::io::stdout();
    let mut reader = BufReader::new(stdin).lines();

    debug!("MCP Server listening on stdin...");
    while let Ok(Some(line)) = reader.next_line().await {
        debug!("Received JSON-RPC line: {}", line);
        if let Ok(req) = serde_json::from_str::<JsonRpcRequest>(&line) {
            let id = req.id.clone().unwrap_or(serde_json::Value::Null);

            match req.method.as_str() {
                "initialize" => {
                    debug!("Processing 'initialize' request");
                    let resp = JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        id,
                        result: Some(json!(InitializeResult {
                            protocol_version: "2024-11-05".to_string(),
                            server_info: ServerInfo {
                                name: "jira-mcp".to_string(),
                                version: "1.0.0".to_string(),
                            },
                            capabilities: ServerCapabilities {
                                tools: Some(json!({})),
                            }
                        })),
                        error: None,
                    };
                    let out = serde_json::to_string(&resp)? + "\n";
                    stdout.write_all(out.as_bytes()).await?;
                }
                "tools/list" => {
                    let tools = vec![
                        Tool {
                            name: "get_issue".to_string(),
                            description: "Get Jira issue details".to_string(),
                            input_schema: json!({
                                "type": "object",
                                "properties": {
                                    "issue_key": {
                                        "type": "string",
                                        "description": "The Jira issue key (e.g. PROJ-123)"
                                    }
                                },
                                "required": ["issue_key"]
                            }),
                        },
                        Tool {
                            name: "search_confluence".to_string(),
                            description: "Search Confluence using CQL (Confluence Query Language)".to_string(),
                            input_schema: json!({
                                "type": "object",
                                "properties": {
                                    "cql_query": {
                                        "type": "string",
                                        "description": "The CQL query string (e.g. text ~ \"architecture\")"
                                    }
                                },
                                "required": ["cql_query"]
                            }),
                        }
                    ];
                    
                    debug!("Processing 'tools/list' request");
                    let resp = JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        id,
                        result: Some(json!({ "tools": tools })),
                        error: None,
                    };
                    let out = serde_json::to_string(&resp)? + "\n";
                    stdout.write_all(out.as_bytes()).await?;
                }
                "tools/call" => {
                    debug!("Processing 'tools/call' request for: {:?}", req.params);
                    let params: CallToolParams = match serde_json::from_value(req.params.unwrap_or_default()) {
                        Ok(p) => p,
                        Err(e) => {
                            error!("Failed to parse CallToolParams: {}", e);
                            continue;
                        }
                    };

                    if params.name == "get_issue" {
                        let issue_key = params.arguments["issue_key"].as_str().unwrap_or("");
                        info!("MCP Server calling Jira for issue: {}", issue_key);
                        match jira_client.get_issue(issue_key).await {
                            Ok(issue) => {
                                let resp = JsonRpcResponse {
                                    jsonrpc: "2.0".to_string(),
                                    id: id.clone(),
                                    result: Some(json!(CallToolResult {
                                        content: vec![CallToolContent {
                                            content_type: "text".to_string(),
                                            text: serde_json::to_string(&issue).unwrap_or_default(),
                                        }],
                                        is_error: false,
                                    })),
                                    error: None,
                                };
                                let out = serde_json::to_string(&resp)? + "\n";
                                stdout.write_all(out.as_bytes()).await?;
                            }
                            Err(e) => {
                                error!("Jira API error: {}", e);
                                let resp = JsonRpcResponse {
                                    jsonrpc: "2.0".to_string(),
                                    id: id.clone(),
                                    result: Some(json!(CallToolResult {
                                        content: vec![CallToolContent {
                                            content_type: "text".to_string(),
                                            text: format!("Error fetching issue: {}", e),
                                        }],
                                        is_error: true,
                                    })),
                                    error: None,
                                };
                                let out = serde_json::to_string(&resp)? + "\n";
                                stdout.write_all(out.as_bytes()).await?;
                            }
                        }
                    } else if params.name == "search_confluence" {
                        let cql_query = params.arguments["cql_query"].as_str().unwrap_or("");
                        info!("MCP Server searching Confluence for: {}", cql_query);
                        match jira_client.search_confluence(cql_query).await {
                            Ok(results) => {
                                let resp = JsonRpcResponse {
                                    jsonrpc: "2.0".to_string(),
                                    id: id.clone(),
                                    result: Some(json!(CallToolResult {
                                        content: vec![CallToolContent {
                                            content_type: "text".to_string(),
                                            text: serde_json::to_string(&results).unwrap_or_default(),
                                        }],
                                        is_error: false,
                                    })),
                                    error: None,
                                };
                                let out = serde_json::to_string(&resp)? + "\n";
                                stdout.write_all(out.as_bytes()).await?;
                            }
                            Err(e) => {
                                error!("Confluence API error: {}", e);
                                let resp = JsonRpcResponse {
                                    jsonrpc: "2.0".to_string(),
                                    id: id.clone(),
                                    result: Some(json!(CallToolResult {
                                        content: vec![CallToolContent {
                                            content_type: "text".to_string(),
                                            text: format!("Error searching confluence: {}", e),
                                        }],
                                        is_error: true,
                                    })),
                                    error: None,
                                };
                                let out = serde_json::to_string(&resp)? + "\n";
                                stdout.write_all(out.as_bytes()).await?;
                            }
                        }
                    } else {
                        warn!("Unknown tool called: {}", params.name);
                    }
                }
                _ => {
                    warn!("Unknown JSON-RPC method: {}", req.method);
                }
            }
        } else {
            error!("Failed to parse JSON-RPC line");
        }
    }
    Ok(())
}
