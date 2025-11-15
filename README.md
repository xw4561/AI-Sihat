# AI-Sihat
An AI-powered healthcare assistant to help patients with medication compliance and pharmacy communication.

## Project Structure

```
AI-Sihat/
├── client/          # Vue 3 frontend (Vite) - See client/README.md
├── server/          # Express backend - See server/README.md
│   └── prisma/      # Prisma ORM - See server/prisma/README.md
└── package.json     # Root scripts for running both
```

## Tech Stack

- **Frontend**: Vue 3, Vite, Vue Router, Axios
- **Backend**: Express, PostgreSQL, Prisma ORM, Google Gemini AI
- **Authentication**: bcrypt, JWT

For detailed information, see:
- [`client/README.md`](./client/README.md) - Frontend documentation
- [`server/README.md`](./server/README.md) - Backend documentation
- [`server/prisma/README.md`](./server/prisma/README.md) - Database setup guide

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database (Supabase recommended)
- Google Gemini API key

### Installation

```powershell
# Install all dependencies
npm run install:all
```

### Configuration

1. Create `server/.env` file with required environment variables:
   ```env
   PORT=8080
   GEMINI_API_KEY=your_api_key_here
   
   # Connection pooling for queries (port 6543)
   DATABASE_URL=your_postgresql_pooled_connection_string
   
   # Direct connection for migrations (port 5432)
   DIRECT_URL=your_postgresql_direct_connection_string
   
   CORS_ORIGIN=http://localhost:5173
   ```

2. Update `server/prisma.config.ts` to use both URLs for proper connection pooling

3. Initialize database (see [`server/prisma/README.md`](./server/prisma/README.md)):
   ```powershell
   cd server
   npx prisma generate
   npx prisma db push
   ```

### Running the Application

```powershell
# Run both frontend and backend
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8080

For individual services:
- `npm run dev:client` - Frontend only
- `npm run dev:server` - Backend only

## Available Scripts

```powershell
npm run install:all    # Install dependencies for root, client, and server
npm run dev            # Run both frontend and backend concurrently
npm run dev:client     # Run frontend only
npm run dev:server     # Run backend only
```

## Architecture

- **Frontend**: Vite dev server on port 5173 with API proxy to backend
- **Backend**: Express server on port 8080
- **Database**: PostgreSQL with Prisma ORM

For detailed API endpoints and architecture, see [`server/README.md`](./server/README.md).

## Key Features

- 🤖 **AI-Powered Chat** - Symptom analysis using Google Gemini AI
- 👤 **User Management** - Authentication and loyalty points system
- 💊 **Medicine Inventory** - Track and manage medicine stock
- 📦 **Order Management** - Automatic points calculation
- 🔧 **Database Manager** - Admin UI for CRUD operations
- 🔐 **Secure IDs** - Uses CUID for random, secure primary keys
- 📊 **Consistent API** - All endpoints use camelCase for JSON fields

## Documentation

- **[Client README](./client/README.md)** - Frontend setup, routes, and components
- **[Server README](./server/README.md)** - Backend API, services, and architecture
- **[Prisma README](./server/prisma/README.md)** - Database setup and management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

