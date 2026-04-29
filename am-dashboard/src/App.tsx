import { useEffect, useState } from 'react';
import './App.css';

interface Task {
  task_code: string;
  state: string;
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/tasks');
        const data = await response.json();
        setTasks(data);
      } catch (error) {
        console.error('Failed to fetch tasks', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 2000); // poll every 2s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container">
      <header>
        <h1>AM-Task Dashboard</h1>
      </header>
      <main>
        {loading ? (
          <p>Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p>No active tasks found.</p>
        ) : (
          <div className="task-grid">
            {tasks.map((task) => (
              <div key={task.task_code} className="task-card">
                <h2>{task.task_code}</h2>
                <div className={`status-badge status-${task.state.toLowerCase().replace(/[^a-z]/g, '')}`}>
                  {task.state}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
