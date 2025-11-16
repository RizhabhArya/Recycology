# RecyWeb - Upcycle AI Hub

A full-stack web application for sustainable living through AI-powered upcycling ideas.

## Project Structure

```
RecyWeb/
├── backend/          # Express + MongoDB + Mongoose backend
├── frontend/         # React frontend
└── README.md
```

## Features

### Backend
- RESTful API with Express
- MongoDB database with Mongoose
- JWT Authentication
- Cloudinary integration for file uploads
- Custom API Error classes
- Standardized API Response utilities
- User personal space (saved ideas, posts)

### Frontend
- React with React Router
- User Authentication
- Product Idea Generator
- Community Inspiration Feed
- User Dashboard
- Responsive Design

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Fill in environment variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Your Cloudinary API key
- `CLOUDINARY_API_SECRET` - Your Cloudinary API secret

5. Start the server:
```bash
npm run dev
```

Backend runs on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Create `.env` file:
```
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm start
```

Frontend runs on `http://localhost:3000`

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/profile` - Update profile (protected)

### Ideas
- `GET /api/ideas?material=plastic` - Get ideas by material
- `POST /api/ideas/generate` - Generate new idea (protected)
- `GET /api/ideas/saved` - Get saved ideas (protected)
- `POST /api/ideas/:id/save` - Save idea (protected)

### Community
- `GET /api/community` - Get all posts
- `POST /api/community` - Create post with file upload (protected)
- `GET /api/community/my-posts` - Get my posts (protected)
- `PUT /api/community/:id/like` - Like/Unlike post (protected)

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Cloudinary
- Multer

### Frontend
- React
- React Router
- Axios
- React Icons

## License

ISC

