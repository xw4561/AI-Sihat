# AI-Sihat
An AI-powered healthcare assistant to help patients with medication compliance and pharmacy communication.

## Project Structure

```
AI-Sihat/
├── client/          # Vue 3 frontend (Vite)
├── server/          # Express backend
│   ├── services/    # Business logic layer
│   │   ├── chatService.js       # Chat flow logic
│   │   ├── sessionService.js    # Session management
│   │   ├── geminiService.js     # AI integration
│   │   ├── userService.js       # User business logic
│   │   ├── orderService.js      # Order business logic
│   │   └── medicineService.js   # Medicine business logic
│   ├── controllers/ # Request/response handling
│   ├── routes/      # Route definitions
│   ├── prisma/      # Prisma ORM configuration
│   │   ├── schema.prisma        # Database schema
│   │   └── client.js            # Prisma client singleton
│   ├── data/        # Data schemas and content
│   │   ├── database-schema.sql  # PostgreSQL schema documentation
│   │   └── symptoms.json        # Chat flow data
│   └── server.js    # Main Express app
└── package.json     # Root package.json for running both
```

## Tech Stack

### Frontend (Client)
- **Vue 3** - Progressive JavaScript framework
- **Vite** - Fast build tool and dev server
- **Vue Router** - Client-side routing
- **Axios** - HTTP client for API calls

#### Client Routes
- `/` → Home (landing page with links)
- `/api-test` → API & Database health checks
- `/chat` → Chat experience powered by the server chat API (`/chat/*`)
- `/database` → Database Manager (CRUD operations for users, medicines, orders)

### Backend (Server)
- **Express** - Node.js web framework
- **PostgreSQL** - Database (via Supabase)
- **Prisma ORM** - Modern type-safe database toolkit
- **Gemini AI** - Google's AI for symptom analysis
- **bcrypt** - Password hashing
- **JWT** - Authentication tokens
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Install all dependencies** (root, client, and server):
   ```powershell
   npm run install:all
   ```

   Or install manually:
   ```powershell
   # Install root dependencies
   npm install

   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

### Running the Application

#### Development Mode (Both frontend and backend)
```powershell
npm run dev
```
This will run both the Vue frontend (http://localhost:5173) and Express backend (http://localhost:3000) concurrently.

#### Run Frontend Only
```powershell
npm run dev:client
```
Vue app will be available at http://localhost:5173

#### Run Backend Only
```powershell
npm run dev:server
```
Express API will be available at http://localhost:3000

### Manual Setup (Alternative)

**Terminal 1 - Backend:**
```powershell
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd client
npm run dev
```

## API Endpoints

### Chat Flow (Session-based, in-memory)
- `POST /chat/start` → Create a chat session and get first question
- `POST /chat/ask` → Submit an answer and get next question
- `POST /chat/recommend` → Get AI-powered recommendation for the session
- `POST /chat/approve` → Confirm/approve recommendation

### Health & Testing
- `GET /api/test` → API health check
- `GET /api/db/health` → Database connection check

### REST API - Users (Prisma + PostgreSQL)
- `POST /ai-sihat/user` → Create user (auto-hashes password)
- `GET /ai-sihat/user` → List all users
- `GET /ai-sihat/user/:id` → Get user by ID
- `PUT /ai-sihat/user/:id/points` → Update user points
- `DELETE /ai-sihat/user/:id` → Delete user

### REST API - Medicines
- `POST /ai-sihat/medicines` → Create medicine
- `GET /ai-sihat/medicines` → List all medicines (supports ?type=X&inStock=true filters)
- `GET /ai-sihat/medicines/:id` → Get medicine by ID
- `PUT /ai-sihat/medicines/:id` → Update medicine
- `DELETE /ai-sihat/medicines/:id` → Delete medicine

### REST API - Orders
- `POST /ai-sihat/order` → Create order (auto-calculates points, updates user)
- `GET /ai-sihat/order` → List all orders
- `GET /ai-sihat/order/:id` → Get order by ID with relations
- `DELETE /ai-sihat/order/:id` → Delete order

## Environment Variables

Create a `.env` file in the `server/` directory (see `.env.example` for the template):

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Gemini AI (Required for chat recommendations)
# Get from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_api_key_here

# CORS (comma-separated origins)
CORS_ORIGIN=http://localhost:5173

# Database - PostgreSQL via Prisma (Required)
# Get from: Supabase → Project Settings → Database → Connection string
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres

# For Supabase Connection Pooling (Recommended):
# DATABASE_URL=postgresql://postgres.PROJECT_ID:PASSWORD@aws-X-region.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Database Setup

**Option 1: Use Supabase (Recommended)**
1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Project Settings → Database**
4. Copy the **Connection string (URI)** or use the **Transaction pooler** string
5. Paste it as `DATABASE_URL` in your `.env` file

**Option 2: Local PostgreSQL**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_sihat
```

### Initialize Database

After setting up your `DATABASE_URL`, run:

```powershell
cd server

# Generate Prisma client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# Optional: Open Prisma Studio to view/edit data
npx prisma studio
```

### Test Database Connection

```powershell
cd server
node tests/test-db.js
```

Expected output:
```
✅ Database connected successfully!
✅ Database query executed successfully!
📊 Database Statistics:
   Users: 0
   Medicines: 0
   Orders: 0
✅ All tests passed! Prisma is ready to use.
```

## Development

- Frontend runs on port **5173** (Vite default)
- Backend runs on port **3000**
- API proxy is configured in `client/vite.config.js` to forward requests:
  - `/api/*` → `http://localhost:3000/api/*`
  - `/chat/*` → `http://localhost:3000/chat/*`
  - `/ai-sihat/*` → `http://localhost:3000/ai-sihat/*`

### Useful Commands

**Database Management:**
```powershell
cd server

# Generate Prisma client after schema changes
npx prisma generate

# Push schema changes to database
npx prisma db push

# Create a migration
npx prisma migrate dev --name your_migration_name

# Open Prisma Studio (GUI for database)
npx prisma studio
# Opens at http://localhost:5555

# Test database connection
node tests/test-db.js
```

**Development:**
```powershell
# Run both client and server
npm run dev

# Run only server
npm run dev:server

# Run only client
npm run dev:client
```

## Building for Production

### Build Frontend
```powershell
cd client
npm run build
```
The built files will be in `client/dist/`

### Run Backend in Production
```powershell
cd server
npm start
```

## Next Steps

1. **Install dependencies:**
   ```powershell
   npm run install:all
   ```

2. **Set up environment:**
   - Copy `server/.env.example` to `server/.env`
   - Add your `GEMINI_API_KEY`
   - Add your `DATABASE_URL` from Supabase

3. **Initialize database:**
   ```powershell
   cd server
   npx prisma generate
   npx prisma db push
   ```

4. **Start development:**
   ```powershell
   npm run dev
   ```

5. **Open in browser:**
   - Frontend: http://localhost:5173
   - Test APIs: http://localhost:5173/api-test
   - Database Manager: http://localhost:5173/database
   - Chat: http://localhost:5173/chat

6. **Optional - View database:**
   ```powershell
   cd server
   npm run studio
   ```

## Database Schema

The application uses three main tables:

- **users** - User accounts with authentication and loyalty points
- **medicines** - Medicine inventory with name, type, quantity
- **orders** - Order history with points tracking and AI consultation flag

See `server/data/database-schema.sql` for the full schema documentation.

## Features

- 🤖 **AI-Powered Chat** - Symptom analysis using Google Gemini AI
- 👤 **User Management** - Registration, authentication, points system
- 💊 **Medicine Inventory** - Track medicines with types and quantities
- 📦 **Order Management** - Create orders with automatic points calculation
- 🎁 **Loyalty Points** - Earn points (quantity × 10, doubled with AI consultation)
- 🔧 **Database Manager** - Admin UI for managing all records
- ✅ **Health Checks** - API and database monitoring endpoints

