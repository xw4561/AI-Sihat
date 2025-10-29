# AI-Sihat Client

Vue 3 frontend application for the AI-Sihat healthcare assistant.

## Tech Stack

- **Vue 3** - Progressive JavaScript framework with Composition API
- **Vite** - Fast build tool and development server
- **Vue Router** - Client-side routing
- **Axios** - HTTP client for API calls

## Project Structure

```
client/
├── src/
│   ├── App.vue              # Root component
│   ├── main.js              # Application entry point
│   ├── style.css            # Global styles
│   ├── router/
│   │   └── index.js         # Route definitions
│   └── views/
│       ├── Home.vue         # Landing page
│       ├── Chat.vue         # AI chat interface
│       ├── APITest.vue      # API & DB health checks
│       └── DatabaseManager.vue  # CRUD operations UI
├── index.html               # HTML template
├── vite.config.js           # Vite configuration
└── package.json             # Dependencies and scripts
```

## Routes

The application has the following routes:

- **`/`** - Home page with navigation links
- **`/chat`** - Interactive chat interface for symptom analysis
- **`/api-test`** - API and database health check page
- **`/database`** - Database manager for CRUD operations on users, medicines, and orders

## Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```powershell
# From the client directory
npm install
```

Or from the root directory:
```powershell
npm run install:all
```

## Development

### Run Development Server

```powershell
npm run dev
```

The application will be available at **http://localhost:5173**

### API Proxy Configuration

The Vite dev server is configured to proxy API requests to the backend server:

- `/api/*` → `http://localhost:3000/api/*`
- `/chat/*` → `http://localhost:3000/chat/*`
- `/ai-sihat/*` → `http://localhost:3000/ai-sihat/*`

This configuration is defined in `vite.config.js`.

**Note:** Make sure the backend server is running on port 3000 before starting the frontend.

## Building for Production

```powershell
npm run build
```

The optimized production files will be generated in the `dist/` directory.

### Preview Production Build

```powershell
npm run preview
```

## Available Scripts

- **`npm run dev`** - Start development server with hot reload
- **`npm run build`** - Build for production
- **`npm run preview`** - Preview production build locally

## Components Overview

### Views

#### Home.vue
Landing page with navigation to different sections of the application.

#### Chat.vue
Interactive chat interface that:
- Starts a chat session with the AI
- Collects symptom information
- Provides medicine recommendations
- Allows users to approve and place orders

#### APITest.vue
Health check dashboard that displays:
- API connectivity status
- Database connection status
- Useful for debugging and monitoring

#### DatabaseManager.vue
Admin interface for managing:
- **Users** - Create, view, update points, and delete users
- **Medicines** - Create, view, filter by type/stock, update, and delete medicines
- **Orders** - Create, view with full details, and delete orders

## API Integration

The client communicates with the backend using Axios. Key API endpoints:

### Chat Flow
- `POST /chat/start` - Initialize chat session
- `POST /chat/ask` - Submit answers to questions
- `POST /chat/recommend` - Get AI recommendation
- `POST /chat/approve` - Approve and create order

### Health Checks
- `GET /api/test` - API health check
- `GET /api/db/health` - Database health check

### Users
- `POST /ai-sihat/user` - Create user
- `GET /ai-sihat/user` - List users
- `GET /ai-sihat/user/:id` - Get user by ID
- `PUT /ai-sihat/user/:id/points` - Update user points
- `DELETE /ai-sihat/user/:id` - Delete user

### Medicines
- `POST /ai-sihat/medicines` - Create medicine
- `GET /ai-sihat/medicines` - List medicines (with optional filters)
- `GET /ai-sihat/medicines/:id` - Get medicine by ID
- `PUT /ai-sihat/medicines/:id` - Update medicine
- `DELETE /ai-sihat/medicines/:id` - Delete medicine

### Orders
- `POST /ai-sihat/order` - Create order
- `GET /ai-sihat/order` - List orders
- `GET /ai-sihat/order/:id` - Get order details
- `DELETE /ai-sihat/order/:id` - Delete order

## Development Tips

1. **Hot Module Replacement**: Vite provides instant hot module replacement during development
2. **Vue DevTools**: Install Vue DevTools browser extension for debugging
3. **Component Structure**: Follow Vue 3 Composition API patterns
4. **Code Organization**: Keep views focused on UI, let the backend handle business logic

## Troubleshooting

### Port Already in Use

If port 5173 is already in use:
```powershell
# Find and kill the process using the port
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Backend Connection Issues

If the frontend cannot connect to the backend:
1. Ensure the backend server is running on port 3000
2. Check the proxy configuration in `vite.config.js`
3. Verify CORS settings in the backend `.env` file

### Build Errors

Clear cache and reinstall:
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

## Next Steps

1. Start the backend server (see `../server/README.md`)
2. Run the frontend development server
3. Navigate to http://localhost:5173
4. Explore the different views and features

## Contributing

When adding new features:
1. Create new views in `src/views/`
2. Add routes in `src/router/index.js`
3. Follow existing code patterns and Vue 3 best practices
4. Test with both development and production builds

## Related Documentation

- [Vue 3 Documentation](https://vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Vue Router Documentation](https://router.vuejs.org/)
- [Axios Documentation](https://axios-http.com/)
