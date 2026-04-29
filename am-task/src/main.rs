use anyhow::Result;
use clap::{Parser, Subcommand};
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;
use std::process::Command;
use axum::{routing::get, Router, Json, extract::State};
use tower_http::cors::CorsLayer;
use std::sync::Arc;
use am_core::db::DbClient;
use serde_json::Value;

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
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)
        .expect("setting default subscriber failed");

    let args = Args::parse();

    match args.command {
        Commands::Start { task } => {
            info!("Starting AM-Task orchestrator for task: {}", task);
            checkout_git_branch(&task)?;
            
            // Connect to local SQLite for state tracking
            let db_url = "sqlite://am_state.db?mode=rwc";
            let db = DbClient::new(db_url).await?;
            
            let mut context = am_core::state::TaskContext::new(task.clone());
            db.save_task_state(&context).await?;
            
            // Simulating workflow
            info!("Fetching Jira...");
            context.state = am_core::state::TaskState::FetchJira;
            db.save_task_state(&context).await?;
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;

            info!("Researching...");
            context.state = am_core::state::TaskState::Research;
            db.save_task_state(&context).await?;
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;

            info!("Ready for Human Review.");
            context.state = am_core::state::TaskState::Review;
            db.save_task_state(&context).await?;

            info!("Task orchestration complete.");
        }
        Commands::Serve { port } => {
            let db_url = "sqlite://am_state.db?mode=rwc";
            let db = DbClient::new(db_url).await?;
            let shared_state = Arc::new(db);

            let app = Router::new()
                .route("/api/tasks", get(get_tasks))
                .layer(CorsLayer::permissive())
                .with_state(shared_state);

            let addr = format!("0.0.0.0:{}", port);
            info!("Dashboard API serving on {}", addr);
            let listener = tokio::net::TcpListener::bind(addr).await?;
            axum::serve(listener, app).await?;
        }
        Commands::McpServer => {
            am_mcp::server::run_stdio_server().await?;
        }
    }

    Ok(())
}

async fn get_tasks(State(db): State<Arc<DbClient>>) -> Json<Value> {
    // For demo purposes, we fetch all by doing a raw query, or just returning a mock
    // if we don't have a get_all_tasks implemented yet.
    // In a real app, implement get_all_tasks in DbClient.
    
    let rows = sqlx::query!("SELECT task_code, state FROM task_state")
        .fetch_all(&db.pool)
        .await
        .unwrap_or_default();
        
    let mut tasks = Vec::new();
    for r in rows {
        tasks.push(serde_json::json!({
            "task_code": r.task_code,
            "state": r.state
        }));
    }

    Json(serde_json::Value::Array(tasks))
}

fn checkout_git_branch(task_code: &str) -> Result<()> {
    info!("Running Git workflow for task: {}", task_code);

    let status = Command::new("git").args(["checkout", "master"]).status()?;
    if !status.success() { anyhow::bail!("Failed to checkout master"); }

    let status = Command::new("git").arg("fetch").status()?;
    if !status.success() { anyhow::bail!("Failed to fetch"); }

    let status = Command::new("git").args(["pull", "origin", "master"]).status()?;
    if !status.success() { anyhow::bail!("Failed to pull"); }

    let status = Command::new("git").args(["checkout", "-b", task_code]).status()?;
    if !status.success() { anyhow::bail!("Failed to checkout new branch"); }

    Ok(())
}
