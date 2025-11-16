# RecyWeb Backend

Backend API for Upcycle AI Hub built with Express, MongoDB, and Mongoose.

## Features

- User Authentication (JWT)
- Product Idea Generation
- Garbage Collector Search
- Educational Campaigns
- Community Posts with Image/Video Upload
- Cloudinary Integration
- Custom API Error Handling
- Standardized API Responses

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Fill in your environment variables:
- MongoDB connection string
- JWT secret
- Cloudinary credentials

4. Run the server:
```bash
npm run dev
```

## API Endpoints

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

### Collectors
- `GET /api/collectors?latitude=&longitude=&radius=` - Get collectors

### Campaigns
- `GET /api/campaigns` - Get all campaigns

### Community
- `GET /api/community` - Get all posts
- `POST /api/community` - Create post with file upload (protected)
- `GET /api/community/my-posts` - Get my posts (protected)
- `PUT /api/community/:id/like` - Like/Unlike post (protected)

## Error Handling

The API uses custom error classes:
- `BadRequestError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `ValidationError` (422)
- `InternalServerError` (500)

## Response Format

All responses follow a standardized format:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success message",
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

