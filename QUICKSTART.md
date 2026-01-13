# 🚀 Quick Start Guide

## Prerequisites Check
- ✅ Node.js 18+ installed
- ✅ npm 9.0.0+ installed
- ⏳ Docker Desktop (needs to be running)

## Steps to Get Running

### 1. Start Docker Desktop
Open Docker Desktop application on Windows and wait for it to fully start.

### 2. Start PostgreSQL Database
```bash
docker-compose up -d
```

### 3. Initialize Database
```bash
npx prisma db push
```

### 4. Seed with Sample Data
```bash
npm run seed
```

Expected output: `✅ Seed completed! Created: 70+ products`

### 5. Start Development Server
```bash
npm run dev
```

The API will be running at `http://localhost:3000`

## Quick Test

Open a new terminal and test the health endpoint:
```bash
curl http://localhost:3000/api/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "service": "gimmie-gift-service"
}
```

## Your First Recommendation

Get personalized gift recommendations:
```bash
curl -X POST http://localhost:3000/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "budget": 100,
    "interests": ["tech", "gaming"]
  }'
```

## Troubleshooting

### "Cannot connect to database"
- Make sure Docker Desktop is running
- Check if PostgreSQL container is up: `docker ps`
- Restart container: `docker-compose restart`

### "Port 3000 already in use"
- Change PORT in `.env` file to a different port (e.g., 3001)

### "Module not found"
- Run `npm install` again
- Run `npx prisma generate`

## Next Steps

See [walkthrough.md](file:///C:/Users/ELITEBOOK%20810/.gemini/antigravity/brain/f149d457-8fdc-486f-a8e8-b8ba1212f9cc/walkthrough.md) for complete testing scenarios and feature demonstrations.
