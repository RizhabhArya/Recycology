# Backend Setup Instructions

## Environment Variables Setup

1. **Copy the template file to create your `.env` file:**
   ```bash
   cp env.template .env
   ```

2. **Fill in your actual credentials in the `.env` file:**

### MongoDB Setup

**Option 1: Local MongoDB**
```env
MONGODB_URI=mongodb://localhost:27017/recyweb
```

**Option 2: MongoDB Atlas (Cloud)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Replace username, password, and cluster URL:
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/recyweb?retryWrites=true&w=majority
```

### JWT Secret

Generate a secure random string:
```bash
# On Linux/Mac:
openssl rand -base64 32

# Or use any random string generator
```

Then update:
```env
JWT_SECRET=your_generated_secret_key_here
```

### Cloudinary Setup

1. Sign up at [Cloudinary](https://cloudinary.com) (free tier available)
2. Go to your Dashboard
3. Copy your credentials:
   - Cloud Name
   - API Key
   - API Secret

Update in `.env`:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Example Complete .env File

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Database Connection
MONGODB_URI=mongodb://localhost:27017/recyweb

# JWT Authentication
JWT_SECRET=my_super_secret_jwt_key_12345
JWT_EXPIRE=7d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=my_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

## After Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:5000`

