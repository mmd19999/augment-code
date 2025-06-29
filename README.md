# Augment Code - Task Manager Application

A full-stack task management application built with React frontend and Express.js backend with MongoDB database.

## Features

- ✅ Add new tasks
- ✅ Mark tasks as complete/incomplete
- ✅ Delete tasks
- ✅ Real-time updates
- ✅ Responsive design
- ✅ Loading indicators
- ✅ Error handling
- ✅ Visual feedback for completed tasks

## Tech Stack

### Backend
- **Express.js** - Web framework for Node.js
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### Frontend
- **React** - JavaScript library for building user interfaces
- **Vite** - Build tool and development server
- **Axios** - HTTP client for API requests
- **CSS3** - Modern styling with gradients and animations

## Project Structure

```
task-manager/
├── backend/
│   ├── server.js          # Express server and API routes
│   ├── package.json       # Backend dependencies
│   ├── .env              # Environment variables
│   └── .gitignore        # Git ignore file
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Main React component
│   │   ├── App.css       # Component styles
│   │   ├── index.css     # Global styles
│   │   └── main.jsx      # React entry point
│   ├── package.json      # Frontend dependencies
│   └── vite.config.js    # Vite configuration
└── README.md             # This file
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn package manager

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/taskmanager
   NODE_ENV=development
   ```

4. Start MongoDB service (if running locally)

5. Start the backend server:
   ```bash
   npm run dev
   ```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:5173`

## API Endpoints

### Tasks
- `GET /tasks` - Fetch all tasks
- `POST /tasks` - Create a new task
- `PUT /tasks/:id` - Update a task (toggle completion)
- `DELETE /tasks/:id` - Delete a task

### Health Check
- `GET /health` - Check API status

## Usage

1. **Adding Tasks**: Type in the input field and click "Add Task" or press Enter
2. **Completing Tasks**: Click the checkbox next to a task to mark it as complete
3. **Deleting Tasks**: Click the red "×" button to delete a task
4. **Visual Feedback**: Completed tasks show with strikethrough text and green background

## Development

### Running Tests
Currently, no tests are implemented. To add tests:

**Backend**: Use Jest or Mocha
```bash
npm install --save-dev jest supertest
```

**Frontend**: Use Vitest (comes with Vite)
```bash
npm run test
```

### Environment Variables

**Backend (.env)**:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/taskmanager
NODE_ENV=development
```

## Deployment

### Backend Deployment (Render/Railway)

1. Create a new service on Render or Railway
2. Connect your GitHub repository
3. Set environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `NODE_ENV`: production
4. Deploy from the `backend` folder

### Frontend Deployment (Netlify/Vercel)

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy the `dist` folder to Netlify or Vercel
3. Update the API base URL in `App.jsx` to point to your deployed backend

## Screenshots

### Main Interface
The application features a clean, modern interface with:
- Gradient background
- Card-based layout
- Responsive design
- Smooth animations

### Task Management
- Add tasks with the input field at the top
- Tasks display in a list with checkboxes
- Completed tasks show visual feedback
- Delete button for each task

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.
