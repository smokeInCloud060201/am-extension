use anyhow::Result;
use clap::{Parser, Subcommand};
use tracing::{debug, error, info, warn, Level};
use tracing_subscriber::FmtSubscriber;
use std::process::Command;
use axum::{routing::get, Router, Json, extract::State};
use tower_http::cors::CorsLayer;
use std::sync::Arc;
use am_core::db::DbClient;
use am_mcp::jira::JiraClient;
use serde_json::Value;
use sqlx::Row;
use regex::Regex;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Start a new task workflow
    Start {
        /// The Jira task code to process (e.g., AM-123)
        #[arg(short, long)]
        task: String,
    },
    /// Serve the dashboard API
    Serve {
        #[arg(short, long, default_value_t = 8080)]
        port: u16,
    },
    /// Run the Jira MCP Server via stdio
    McpServer,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Load .env file
    dotenvy::dotenv().ok();

    // Initialize logging based on PROFILE
    let profile = std::env::var("PROFILE").unwrap_or_else(|_| "PROD".to_string());
    let max_level = if profile.to_lowercase() == "dev" {
        Level::DEBUG
    } else {
        Level::INFO
    };

    let subscriber = FmtSubscriber::builder()
        .with_max_level(max_level)
        .with_writer(std::io::stderr) // Crucial: Log to stderr so we don't break MCP stdout JSON-RPC
        .finish();
    tracing::subscriber::set_global_default(subscriber).expect("setting default subscriber failed");

    debug!("Application started with PROFILE={}", profile);
    debug!("Loaded JIRA_DOMAIN: {}", std::env::var("JIRA_DOMAIN").unwrap_or_default());
    debug!("Loaded JIRA_EMAIL: {}", std::env::var("JIRA_EMAIL").unwrap_or_default());
    debug!("JIRA_API_TOKEN is {}", if std::env::var("JIRA_API_TOKEN").is_ok() { "set" } else { "NOT set" });
    debug!("WORKSPACE_PATH: {}", std::env::var("WORKSPACE_PATH").unwrap_or_else(|_| "../../company".to_string()));

    let args = Args::parse();

    match args.command {
        Commands::Start { task } => {
            info!("Starting workflow for task: {}", task);
            debug!("Initializing database connection for task {}", task);

            let db_url = "sqlite://am_state.db?mode=rwc";
            let db = DbClient::new(db_url).await?;
            
            let mut context = am_core::state::TaskContext::new(task.clone());
            db.save_task_state(&context).await?;

            info!("Fetching Jira Context...");
            debug!("Transitioning state to FetchJira for {}", task);
            context.state = am_core::state::TaskState::FetchJira;
            db.save_task_state(&context).await?;

            let jira_domain = std::env::var("JIRA_DOMAIN").unwrap_or_default();
            let jira_email = std::env::var("JIRA_EMAIL").unwrap_or_default();
            let jira_token = std::env::var("JIRA_API_TOKEN").unwrap_or_default();
            let jira_client = JiraClient::new(jira_domain, jira_email, jira_token);

            let issue = jira_client.get_issue(&task).await?;
            let desc_json = serde_json::to_string(&issue["fields"]["description"]).unwrap_or_default();
            
            debug!("Raw Jira Description JSON: {}", desc_json);

            // Extract projects matching `In [ProjectName]`
            let re = Regex::new(r#"In \[([a-zA-Z0-9_-]+)\]"#).unwrap();
            let mut target_projects = Vec::new();
            for cap in re.captures_iter(&desc_json) {
                target_projects.push(cap[1].to_string());
            }

            let projects_list = if target_projects.is_empty() {
                "None found (Running in orchestrator root)".to_string()
            } else {
                target_projects.join("\n- ")
            };

            // Generate the hand-off file for Antigravity FIRST
            info!("Preparing task context for Antigravity...");
            let output_dir = std::path::Path::new("_bmad-output");
            if !output_dir.exists() {
                std::fs::create_dir_all(output_dir).expect("Failed to create _bmad-output directory");
            }
            let task_file = output_dir.join("current-task.md");
            
            let content = format!(
                "# Task: {}\n\n## Target Projects Detected:\n- {}\n\n## Instructions\nPlease implement the required changes locally across the target projects and leave them uncommitted for human review.\n\n## Jira Raw Description JSON\n{}",
                task,
                projects_list,
                desc_json
            );
            std::fs::write(&task_file, content).expect("Failed to write current-task.md");

            if target_projects.is_empty() {
                warn!("No target projects found in Jira description! Using current directory as fallback.");
                if let Err(e) = checkout_git_branch(&task, &std::env::current_dir()?) {
                    error!("Failed fallback git workflow: {}", e);
                }
            } else {
                let workspace_root_str = std::env::var("WORKSPACE_PATH")
                    .unwrap_or_else(|_| "../../company".to_string());
                let workspace_root = std::path::PathBuf::from(workspace_root_str);
                
                for project in &target_projects {
                    let project_path = workspace_root.join(project);
                    info!("Found target project: {} at {:?}", project, project_path);
                    if let Err(e) = checkout_git_branch(&task, &project_path) {
                        error!("Failed git workflow for project {}: {}", project, e);
                    }
                }
            }

            info!("Researching...");
            context.state = am_core::state::TaskState::Research;
            db.save_task_state(&context).await?;
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;

            info!("Ready for Human Review. Tell Antigravity to implement!");
            context.state = am_core::state::TaskState::Review;
            db.save_task_state(&context).await?;

            info!("Task orchestration complete.");
        }
        Commands::Serve { port } => {
            info!("Starting dashboard API server on port {}", port);
            let db_url = "sqlite://am_state.db?mode=rwc";
            let db = DbClient::new(db_url).await?;
            let shared_state = Arc::new(db);

            let app = Router::new()
                .route("/api/tasks", get(get_tasks))
                .layer(CorsLayer::permissive())
                .with_state(shared_state);

            let addr = format!("0.0.0.0:{}", port);
            debug!("Binding TCP listener to {}", addr);
            let listener = tokio::net::TcpListener::bind(addr).await?;
            axum::serve(listener, app).await?;
        }
        Commands::McpServer => {
            debug!("Starting MCP server via stdio...");
            am_mcp::server::run_stdio_server().await?;
        }
    }

    Ok(())
}

async fn get_tasks(State(db): State<Arc<DbClient>>) -> Json<Value> {
    // For demo purposes, we fetch all by doing a raw query, or just returning a mock
    // if we don't have a get_all_tasks implemented yet.
    // In a real app, implement get_all_tasks in DbClient.
    
    let rows = sqlx::query("SELECT task_code, state FROM task_state")
        .fetch_all(&db.pool)
        .await
        .unwrap_or_default();
        
    let mut tasks = Vec::new();
    for r in rows {
        tasks.push(serde_json::json!({
            "task_code": r.get::<String, _>("task_code"),
            "state": r.get::<String, _>("state")
        }));
    }

    Json(serde_json::Value::Array(tasks))
}

fn checkout_git_branch(task_code: &str, project_path: &std::path::Path) -> Result<()> {
    if !project_path.exists() {
        anyhow::bail!("Project path does not exist: {:?}", project_path);
    }
    info!("Running Git workflow for task: {} in {:?}", task_code, project_path);

    let status = Command::new("git").current_dir(project_path).args(["checkout", "master"]).status()?;
    if !status.success() { anyhow::bail!("Failed to checkout master in {:?}", project_path); }

    let status = Command::new("git").current_dir(project_path).arg("fetch").status()?;
    if !status.success() { anyhow::bail!("Failed to fetch in {:?}", project_path); }

    let status = Command::new("git").current_dir(project_path).args(["pull", "origin", "master"]).status()?;
    if !status.success() { anyhow::bail!("Failed to pull in {:?}", project_path); }

    let status = Command::new("git").current_dir(project_path).args(["checkout", "-b", task_code]).status()?;
    if !status.success() { anyhow::bail!("Failed to checkout new branch in {:?}", project_path); }

    Ok(())
}
