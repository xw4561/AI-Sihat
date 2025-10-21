# AI-Sihat
An AI-powered healthcare assistant to help patients with medication compliance and pharmacy communication.

## Project Structure

```
AI-Sihat/
├── client/          # Vue 3 frontend (Vite)
├── server/          # Express backend
└── package.json     # Root package.json for running both
```

## Tech Stack

### Frontend (Client)
- **Vue 3** - Progressive JavaScript framework
- **Vite** - Fast build tool and dev server
- **Vue Router** - Client-side routing
- **Axios** - HTTP client for API calls

### Backend (Server)
- **Express** - Node.js web framework
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

- `GET /api/health` - Check API status
- `GET /api/medications` - Get list of medications

## Environment Variables

Create a `.env` file in the `server/` directory:
```
PORT=3000
# Add your environment variables here
```

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

