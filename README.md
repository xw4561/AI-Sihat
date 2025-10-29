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
│   ├── models/      # Sequelize models
│   ├── config/      # Configuration files
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
- `/` → Home
- `/api-test` → Simple UI to hit backend test endpoint(s)
- `/chat` → Chat experience powered by the server chat API (`/chat/*`)

### Backend (Server)
- **Express** - Node.js web framework
- **PostgreSQL** - Database (via Supabase or local)
- **Sequelize** - ORM for database operations
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

Chat flow (session-based, in-memory):

- `POST /chat/start` → Create a chat session and get first question
- `POST /chat/ask` → Submit an answer and get next question
- `POST /chat/recommend` → Get a simple recommendation for the session
- `POST /chat/approve` → Simulate approval/confirmation
- `GET /api/test` → Simple health check

REST resources (Sequelize + MySQL):

- `POST /ai-sihat/user` → Create user
- `GET /ai-sihat/user` → List users
- `GET /ai-sihat/user/:id` → Get a user
- `PUT /ai-sihat/user/:id/points` → Update user points
- `POST /ai-sihat/user/delete` → Delete user (POST)
- `POST /ai-sihat/medicines` → Create medicine
- `POST /ai-sihat/order` → Create order

## Environment Variables

Create a `.env` file in the `server/` directory (see `.env.example` for the full list):

```
PORT=3000

# Gemini (required for AI summary)
GEMINI_API_KEY=your_api_key_here

# CORS (comma separated)
CORS_ORIGIN=http://localhost:5173

# Database (PostgreSQL/Supabase - required for REST resources)
# Option A: Use connection URL (recommended)
DB_URL=postgresql://postgres:YOUR_PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres
DB_SSL=true

# Option B: Use discrete params
DB=postgres
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=db.your-project.supabase.co
DB_PORT=5432
DB_DIALECT=postgres
DB_SSL=true
TIMEZONE=+00:00
```

Notes:
- Get your Supabase connection string from: **Project Settings → Database → Connection string (URI)**
- If DB variables are not provided, the REST endpoints will be mounted but database operations will fail; the chat endpoints still work.
- On first run with a valid DB, tables will be created automatically via Sequelize `sync()`.

## Development

- Frontend runs on port **5173** (Vite default)
- Backend runs on port **3000**
- API proxy is configured in `client/vite.config.js` to forward `/api/*` requests to the backend

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

1. Install dependencies: `npm run install:all`
2. Start development: `npm run dev`
3. Open http://localhost:5173 in your browser
4. Start building your healthcare assistant features!

