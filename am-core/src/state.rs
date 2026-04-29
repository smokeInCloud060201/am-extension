use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TaskState {
    Init,
    FetchJira,
    Research,
    Plan,
    Implement,
    Review,
    Done,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskContext {
    pub task_code: String,
    pub state: TaskState,
    pub jira_description: Option<String>,
    pub research_data: Option<String>,
    pub plan_data: Option<String>,
    pub error_msg: Option<String>,
}

impl TaskContext {
    pub fn new(task_code: String) -> Self {
        Self {
            task_code,
            state: TaskState::Init,
            jira_description: None,
            research_data: None,
            plan_data: None,
            error_msg: None,
        }
    }
}
