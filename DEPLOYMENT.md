# Deployment Guide

This guide will help you deploy the Task Manager application to production.

## Backend Deployment

### Option 1: Render

1. **Create a Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create a Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your task manager

3. **Configure the Service**
   - **Name**: `task-manager-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Instance Type**: Free

4. **Set Environment Variables**
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `PORT`: `10000` (Render default)

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete

### Option 2: Railway

1. **Create a Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy from GitHub**
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Choose the backend folder

3. **Configure Environment Variables**
   - Add `MONGODB_URI` with your MongoDB Atlas connection string
   - Add `NODE_ENV` as `production`

4. **Deploy**
   - Railway will automatically deploy your application

## Frontend Deployment

### Option 1: Netlify

1. **Build the Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Drag and drop the `dist` folder to deploy
   - Or connect your GitHub repository

3. **Update API URL**
   - Update the `API_BASE_URL` in `src/App.jsx` to your deployed backend URL

### Option 2: Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   cd frontend
   vercel
   ```

3. **Configure**
   - Follow the prompts
   - Update the API URL to point to your deployed backend

## Database Setup (MongoDB Atlas)

1. **Create a MongoDB Atlas Account**
   - Go to [mongodb.com/atlas](https://mongodb.com/atlas)
   - Sign up for free

2. **Create a Cluster**
   - Choose the free tier
   - Select a region close to your users

3. **Create a Database User**
   - Go to Database Access
   - Add a new database user
   - Choose password authentication

4. **Configure Network Access**
   - Go to Network Access
   - Add IP address `0.0.0.0/0` (allow from anywhere)

5. **Get Connection String**
   - Go to Clusters → Connect
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

## Environment Variables

### Backend (.env for production)
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/taskmanager?retryWrites=true&w=majority
PORT=10000
```

### Frontend (update in App.jsx)
```javascript
const API_BASE_URL = 'https://your-backend-url.onrender.com'
// or
const API_BASE_URL = 'https://your-backend-url.up.railway.app'
```

## Post-Deployment Checklist

- [ ] Backend is accessible via HTTPS
- [ ] Frontend can connect to backend API
- [ ] Database connection is working
- [ ] CORS is properly configured
- [ ] All environment variables are set
- [ ] Error handling is working
- [ ] Application loads without errors

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure your backend has CORS enabled
   - Check that the frontend URL is allowed

2. **Database Connection Issues**
   - Verify MongoDB Atlas connection string
   - Check network access settings
   - Ensure database user has proper permissions

3. **Build Failures**
   - Check that all dependencies are in package.json
   - Verify build commands are correct
   - Check for any missing environment variables

4. **API Not Responding**
   - Check backend logs for errors
   - Verify the correct port is being used
   - Ensure the start command is correct

### Monitoring

- **Render**: Check the logs in the Render dashboard
- **Railway**: Use the Railway dashboard to monitor deployments
- **Netlify**: Check the deploy logs in Netlify
- **Vercel**: Monitor deployments in the Vercel dashboard

## Custom Domain (Optional)

### For Backend
- Add a custom domain in your hosting provider's dashboard
- Update DNS records as instructed

### For Frontend
- Add a custom domain in Netlify/Vercel
- Update DNS records to point to the hosting provider

## SSL/HTTPS

Both Render, Railway, Netlify, and Vercel provide automatic SSL certificates for your applications.

## Scaling

- **Free Tiers**: Suitable for development and small projects
- **Paid Tiers**: Consider upgrading for production applications with higher traffic
- **Database**: MongoDB Atlas free tier includes 512MB storage

## Backup Strategy

- **Database**: MongoDB Atlas provides automated backups
- **Code**: Ensure your code is backed up in version control (Git)
- **Environment Variables**: Keep a secure backup of your environment variables
