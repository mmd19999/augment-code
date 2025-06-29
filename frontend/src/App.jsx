import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE_URL = 'http://localhost:5000'

function App() {
  const [tasks, setTasks] = useState([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch tasks from the API
  const fetchTasks = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get(`${API_BASE_URL}/tasks`)
      setTasks(response.data)
    } catch (err) {
      setError('Failed to fetch tasks. Make sure the backend server is running.')
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  // Add a new task
  const addTask = async (e) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    setLoading(true)
    setError('')
    try {
      const response = await axios.post(`${API_BASE_URL}/tasks`, {
        title: newTaskTitle.trim()
      })
      setTasks([response.data, ...tasks])
      setNewTaskTitle('')
    } catch (err) {
      setError('Failed to add task. Please try again.')
      console.error('Error adding task:', err)
    } finally {
      setLoading(false)
    }
  }

  // Toggle task completion
  const toggleTask = async (taskId, currentCompleted) => {
    setError('')
    try {
      const response = await axios.put(`${API_BASE_URL}/tasks/${taskId}`, {
        completed: !currentCompleted
      })
      setTasks(tasks.map(task =>
        task._id === taskId ? response.data : task
      ))
    } catch (err) {
      setError('Failed to update task. Please try again.')
      console.error('Error updating task:', err)
    }
  }

  // Delete a task
  const deleteTask = async (taskId) => {
    setError('')
    try {
      await axios.delete(`${API_BASE_URL}/tasks/${taskId}`)
      setTasks(tasks.filter(task => task._id !== taskId))
    } catch (err) {
      setError('Failed to delete task. Please try again.')
      console.error('Error deleting task:', err)
    }
  }

  // Load tasks on component mount
  useEffect(() => {
    fetchTasks()
  }, [])

  return (
    <div className="app">
      <div className="container">
        <h1>Task Manager</h1>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={addTask} className="add-task-form">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Enter a new task..."
            className="task-input"
            disabled={loading}
          />
          <button
            type="submit"
            className="add-button"
            disabled={loading || !newTaskTitle.trim()}
          >
            {loading ? 'Adding...' : 'Add Task'}
          </button>
        </form>

        {loading && tasks.length === 0 ? (
          <div className="loading">Loading tasks...</div>
        ) : (
          <div className="tasks-container">
            {tasks.length === 0 ? (
              <p className="no-tasks">No tasks yet. Add one above!</p>
            ) : (
              <ul className="tasks-list">
                {tasks.map(task => (
                  <li key={task._id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                    <div className="task-content">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task._id, task.completed)}
                        className="task-checkbox"
                      />
                      <span className="task-title">{task.title}</span>
                    </div>
                    <button
                      onClick={() => deleteTask(task._id)}
                      className="delete-button"
                      title="Delete task"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="footer">
          <p>Task Manager - Built with React & Express.js</p>
          <p>
            {tasks.length > 0 && (
              <>
                Total: {tasks.length} |
                Completed: {tasks.filter(task => task.completed).length} |
                Remaining: {tasks.filter(task => !task.completed).length}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
