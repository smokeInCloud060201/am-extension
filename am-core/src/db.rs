use anyhow::Result;
use sqlx::{sqlite::SqlitePoolOptions, Row, SqlitePool};
use tracing::info;
use crate::state::{TaskContext, TaskState};

pub struct DbClient {
    pub pool: SqlitePool,
}

impl DbClient {
    pub async fn new(db_url: &str) -> Result<Self> {
        info!("Connecting to SQLite at {}", db_url);
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(db_url)
            .await?;

        // Initialize schema
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS task_state (
                task_code TEXT PRIMARY KEY,
                state TEXT NOT NULL,
                jira_description TEXT,
                research_data TEXT,
                plan_data TEXT,
                error_msg TEXT
            )
            "#,
        )
        .execute(&pool)
        .await?;

        Ok(Self { pool })
    }

    pub async fn get_task_state(&self, task_code: &str) -> Result<Option<TaskContext>> {
        let row = sqlx::query("SELECT task_code, state, jira_description, research_data, plan_data, error_msg FROM task_state WHERE task_code = ?")
            .bind(task_code)
            .fetch_optional(&self.pool)
            .await?;

        match row {
            Some(r) => {
                let state_str: String = r.try_get("state")?;
                let state: TaskState = serde_json::from_str(&format!("\"{}\"", state_str))
                    .unwrap_or(TaskState::Error); // fallback

                Ok(Some(TaskContext {
                    task_code: r.try_get("task_code")?,
                    state,
                    jira_description: r.try_get("jira_description")?,
                    research_data: r.try_get("research_data")?,
                    plan_data: r.try_get("plan_data")?,
                    error_msg: r.try_get("error_msg")?,
                }))
            }
            None => Ok(None),
        }
    }

    pub async fn save_task_state(&self, context: &TaskContext) -> Result<()> {
        let state_str = serde_json::to_string(&context.state)?.replace("\"", "");
        sqlx::query(
            r#"
            INSERT INTO task_state (task_code, state, jira_description, research_data, plan_data, error_msg)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(task_code) DO UPDATE SET
                state = excluded.state,
                jira_description = excluded.jira_description,
                research_data = excluded.research_data,
                plan_data = excluded.plan_data,
                error_msg = excluded.error_msg
            "#,
        )
        .bind(&context.task_code)
        .bind(state_str)
        .bind(&context.jira_description)
        .bind(&context.research_data)
        .bind(&context.plan_data)
        .bind(&context.error_msg)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
