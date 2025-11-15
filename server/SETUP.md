# AI-Sihat Server Setup Guide

## Quick Start (Windows PowerShell)

### 1. Install Dependencies
```powershell
cd server
npm install
```

### 2. Set Up Database Connection
```powershell
# Copy the example env file
cp .env.example .env

# Edit .env with your database credentials
notepad .env
```

**Fill in `DATABASE_URL`** with your PostgreSQL connection string:
- **Local PostgreSQL**: `postgresql://postgres:password@localhost:5432/ai_sihat_db?schema=public`
- **Supabase (Cloud)**: `postgresql://postgres:[password]@[project].supabase.co:5432/postgres?schema=public`

### 3. Generate Prisma Client
If you hit EPERM errors during generate (common on Windows), use the helper script:
```powershell
.\scripts\prisma-fix.ps1
```

Or manually:
```powershell
npx prisma generate
```

### 4. Run Database Migrations
```powershell
# Apply schema to database
npx prisma migrate deploy

# OR if first time setup:
npx prisma migrate dev --name init
```

### 5. Seed Test Data (Optional but Recommended)
```powershell
npm run seed
```

This creates 3 test users:
- **Admin**: `admin@example.com` / `admin123`
- **Pharmacist**: `pharmacist@example.com` / `pharmacist123`
- **User**: `user@example.com` / `user123`

### 6. Start the Server
```powershell
npm start
# or for development with auto-reload:
npm run dev
```

Server runs at `http://localhost:8080`

## Testing the Connection

### Check Database Health
```powershell
# In PowerShell, test the health endpoint:
Invoke-RestMethod http://localhost:8080/api/db/health
# Should return: @{ ok = True; dialect = "postgresql" }
```

### View Database with Prisma Studio
```powershell
npx prisma studio
# Opens web UI to browse/edit data
```

## Troubleshooting

### "DATABASE_URL is not set"
- Ensure `.env` file exists in the `server` folder
- Check that `DATABASE_URL` is filled with a valid connection string
- Restart the server after changing `.env`

### "Connection refused" / "connect ECONNREFUSED"
- PostgreSQL is not running or not accessible
- Check DATABASE_URL host/port are correct
- Test connection with: `psql "postgresql://user:pass@host:port/db"`

### EPERM: rename ... query_engine-windows.dll.node
- Windows file locking issue
- Run: `.\scripts\prisma-fix.ps1` (see script for details)
- Or kill node processes: `Stop-Process -Name node -Force`

### "User not found" errors in Profile
- No users exist in the database
- Run seed script: `npm run seed`
- Or create one via registration endpoint

## API Endpoints

### Users
- `POST /ai-sihat/user` - Create user
- `GET /ai-sihat/user` - Get all users
- `GET /ai-sihat/user/:id` - Get user by ID
- `PUT /ai-sihat/user/:id` - Update user (username, email, password)
- `PUT /ai-sihat/user/:id/points` - Update user points

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `PUT /api/auth/change-role` - Change user role (admin only)

### Other
- `GET /api/test` - Test endpoint
- `GET /api/db/health` - Database health check

## Environment Variables

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | Yes | `postgresql://...` | PostgreSQL connection string |
| `DIRECT_URL` | No | `postgresql://...` | For pooling; can match DATABASE_URL |
| `PORT` | No | `8080` | Server port |
| `NODE_ENV` | No | `development` | Environment type |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed frontend origin |
| `GOOGLE_GENAI_API_KEY` | No | (API key) | For Gemini chat feature |

## Database Schema

See `prisma/schema.prisma` for the complete data model:
- `User` - User accounts with role and points
- `Medicine` - Medication inventory
- `Order` - User orders
- `Chat` - Chat history with AI recommendations

Run `npx prisma studio` to view/edit data interactively.
