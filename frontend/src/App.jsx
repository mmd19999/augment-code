import { useState, useEffect } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'react-hot-toast'
import {
  Plus,
  Trash2,
  Check,
  Search,
  Filter,
  Moon,
  Sun,
  Calendar,
  Flag,
  Edit3,
  MoreVertical
} from 'lucide-react'
import './App.css'

const API_BASE_URL = 'http://localhost:5000'

function App() {
  const [tasks, setTasks] = useState([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, completed, pending
  const [darkMode, setDarkMode] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  // Fetch tasks from the API
  const fetchTasks = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get(`${API_BASE_URL}/tasks`)
      setTasks(response.data)
      toast.success('Tasks loaded successfully!')
    } catch (err) {
      const errorMsg = 'Failed to fetch tasks. Make sure the backend server is running.'
      setError(errorMsg)
      toast.error(errorMsg)
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
      toast.success('Task added successfully!')
    } catch (err) {
      const errorMsg = 'Failed to add task. Please try again.'
      setError(errorMsg)
      toast.error(errorMsg)
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
      toast.success(currentCompleted ? 'Task marked as pending' : 'Task completed!')
    } catch (err) {
      const errorMsg = 'Failed to update task. Please try again.'
      setError(errorMsg)
      toast.error(errorMsg)
      console.error('Error updating task:', err)
    }
  }

  // Delete a task
  const deleteTask = async (taskId) => {
    setError('')
    try {
      await axios.delete(`${API_BASE_URL}/tasks/${taskId}`)
      setTasks(tasks.filter(task => task._id !== taskId))
      toast.success('Task deleted successfully!')
    } catch (err) {
      const errorMsg = 'Failed to delete task. Please try again.'
      setError(errorMsg)
      toast.error(errorMsg)
      console.error('Error deleting task:', err)
    }
  }

  // Filter tasks based on search and status
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'completed' && task.completed) ||
      (filterStatus === 'pending' && !task.completed)
    return matchesSearch && matchesFilter
  })

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  // Load tasks on component mount
  useEffect(() => {
    fetchTasks()
  }, [])

  return (
    <div className={`app ${darkMode ? 'dark' : ''}`}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: darkMode ? '#374151' : '#ffffff',
            color: darkMode ? '#ffffff' : '#000000',
          },
        }}
      />

      <div className="container">
        {/* Header with theme toggle */}
        <div className="header">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            ✨ Task Manager
          </motion.h1>
          <button
            onClick={toggleDarkMode}
            className="theme-toggle"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Search and Filter Section */}
        <motion.div
          className="controls-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="search-container">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="search-input"
            />
          </div>

          <div className="filter-container">
            <Filter className="filter-icon" size={18} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Tasks</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </motion.div>

        {/* Add Task Form */}
        <motion.form
          onSubmit={addTask}
          className="add-task-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="input-container">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="task-input"
              disabled={loading}
            />
            <motion.button
              type="submit"
              className="add-button"
              disabled={loading || !newTaskTitle.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={18} />
              {loading ? 'Adding...' : 'Add Task'}
            </motion.button>
          </div>
        </motion.form>

        {/* Tasks Display */}
        <motion.div
          className="tasks-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {loading && tasks.length === 0 ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Loading your tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <motion.div
              className="empty-state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {tasks.length === 0 ? (
                <>
                  <div className="empty-icon">📝</div>
                  <h3>No tasks yet</h3>
                  <p>Add your first task above to get started!</p>
                </>
              ) : (
                <>
                  <div className="empty-icon">🔍</div>
                  <h3>No tasks found</h3>
                  <p>Try adjusting your search or filter criteria.</p>
                </>
              )}
            </motion.div>
          ) : (
            <AnimatePresence>
              <ul className="tasks-list">
                {filteredTasks.map((task, index) => (
                  <motion.li
                    key={task._id}
                    className={`task-item ${task.completed ? 'completed' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    layout
                  >
                    <div className="task-content">
                      <motion.button
                        className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                        onClick={() => toggleTask(task._id, task.completed)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {task.completed && <Check size={14} />}
                      </motion.button>
                      <span className="task-title">{task.title}</span>
                    </div>
                    <div className="task-actions">
                      <motion.button
                        onClick={() => deleteTask(task._id)}
                        className="delete-button"
                        title="Delete task"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </AnimatePresence>
          )}
        </motion.div>

        {/* Stats Footer */}
        {tasks.length > 0 && (
          <motion.div
            className="stats-footer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{tasks.length}</span>
                <span className="stat-label">Total</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{tasks.filter(task => task.completed).length}</span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{tasks.filter(task => !task.completed).length}</span>
                <span className="stat-label">Remaining</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {tasks.length > 0 ? Math.round((tasks.filter(task => task.completed).length / tasks.length) * 100) : 0}%
                </span>
                <span className="stat-label">Progress</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{
                  width: `${tasks.length > 0 ? (tasks.filter(task => task.completed).length / tasks.length) * 100 : 0}%`
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}

        <div className="footer">
          <p>✨ Task Manager - Built with React & Express.js</p>
        </div>
      </div>
    </div>
  )
}

export default App
