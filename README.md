# AM-Task Orchestrator

An autonomous agent orchestration tool built with Rust and React. It manages Jira tickets via the Model Context Protocol (MCP) and seamlessly hands off tasks to the Antigravity IDE assistant for implementation.

## Project Structure
- `am-task`: The primary CLI orchestrator.
- `am-core`: State machine and SQLite database layer.
- `am-mcp`: Jira MCP Server and protocol definitions.
- `am-dashboard`: React web application for tracking agent status.

## Prerequisites
- **Rust**: Ensure you have `cargo` installed.
- **Bun**: Ensure you have `bun` installed for the dashboard.
- **Jira API**: You need your Jira domain, email, and API token.

## How to Start

### 1. Start the Dashboard UI
The dashboard provides a visual overview of task states.
```bash
cd am-dashboard
bun install
bun run dev
```

### 2. Start the Orchestrator API
In a new terminal window, start the backend API that serves the SQLite state to the dashboard.
```bash
cargo run --bin am-task -- serve
```

### 3. Kick off a Task
In a third terminal window, copy `.env.example` to `.env` and set your Jira variables. Then run the `start` command to initiate a new task workflow. This will checkout a new Git branch, fetch the Jira ticket via the MCP server, and prepare the task for Antigravity.
```bash
cp .env.example .env
# Edit .env with your credentials

cargo run --bin am-task -- start --task PROJ-123
```

### 4. Implement with Antigravity
Once the CLI finishes, it will generate a context file in `_bmad-output/current-task.md` and the dashboard will update to **Ready for Agent**.

Open your IDE, select the Antigravity assistant, and say:
> "Implement the task described in _bmad-output/current-task.md"

Antigravity will analyze the context, plan the solution, and write the code locally. Review the uncommitted changes and commit them when ready!
