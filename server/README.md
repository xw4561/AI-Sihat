# AI-Sihat Server

Express.js backend server for the AI-Sihat healthcare assistant, featuring AI-powered symptom analysis, medicine management, and order processing.

## Tech Stack

- **Express** - Node.js web framework
- **PostgreSQL** - Relational database (via Supabase)
- **Prisma ORM** - Type-safe database toolkit
- **Google Gemini AI** - AI-powered symptom analysis
- **bcrypt** - Password hashing
- **JWT** - Authentication tokens
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## Project Structure

```
server/
├── controllers/              # Request/response handlers
│   ├── users.controller.js
│   ├── medicines.controller.js
│   └── orders.controller.js
├── services/                 # Business logic layer
│   ├── chatService.js        # Chat flow orchestration
│   ├── sessionService.js     # In-memory session management
│   ├── geminiService.js      # Google Gemini AI integration
│   ├── userService.js        # User business logic
│   ├── medicineService.js    # Medicine business logic
│   └── orderService.js       # Order business logic
├── routes/                   # API route definitions
│   ├── chat.routes.js        # Chat endpoints
│   ├── users.routes.js       # User CRUD endpoints
│   ├── medicines.routes.js   # Medicine CRUD endpoints
│   ├── orders.routes.js      # Order CRUD endpoints
│   └── router.routes.js      # Main router aggregation
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── client.js             # Prisma client singleton
├── data/
│   └── symptoms.json         # Chat flow questions data
├── tests/
│   └── test-db.js            # Database connection test
├── server.js                 # Main Express application
├── index.js                  # Server entry point
└── package.json              # Dependencies and scripts
```

## Architecture

### Layered Design

1. **Routes Layer** - Defines API endpoints and maps to controllers
2. **Controllers Layer** - Handles HTTP requests/responses, validation
3. **Services Layer** - Contains business logic and database operations
4. **Prisma Layer** - Database access and ORM operations

### Key Components

- **Session Management** - In-memory session storage for chat flows
- **AI Integration** - Google Gemini for medicine recommendations
- **Password Security** - bcrypt for hashing user passwords
- **Error Handling** - Centralized error handling and validation

## Setup

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database (Supabase recommended)
- Google Gemini API key

### Installation

```powershell
# From the server directory
npm install
```

Or from the root directory:
```powershell
npm run install:all
```

### Environment Variables

Create a `.env` file in the server directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Gemini AI (Required for chat recommendations)
# Get your API key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_api_key_here

# CORS Origins (comma-separated)
CORS_ORIGIN=http://localhost:5173

# Database Connection
# Get from Supabase: Project Settings → Database → Connection string
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres

# For connection pooling (Recommended for production):
# DATABASE_URL=postgresql://postgres.PROJECT_ID:PASSWORD@aws-X-region.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Database Setup

#### Option 1: Supabase (Recommended)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Project Settings → Database**
4. Copy the **Connection string (URI)**
5. Paste it as `DATABASE_URL` in your `.env` file

#### Option 2: Local PostgreSQL

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_sihat
```

### Initialize Database

```powershell
# Generate Prisma client
npx prisma generate

# Create/update database tables
npx prisma db push

# Optional: Open Prisma Studio to view data
npx prisma studio
```

### Test Database Connection

```powershell
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

## Running the Server

### Development Mode

```powershell
npm run dev
```

Server will run on **http://localhost:3000** with auto-restart on file changes.

### Production Mode

```powershell
npm start
```

## API Endpoints

### Health & Testing

#### `GET /api/test`
Check if API is running.

**Response:**
```json
{
  "message": "AI-Sihat API is running!"
}
```

#### `GET /api/db/health`
Check database connectivity.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-29T..."
}
```

### Chat Flow (Session-based)

#### `POST /chat/start`
Initialize a new chat session.

**Response:**
```json
{
  "sessionId": "uuid",
  "currentQuestion": {
    "question": "What are your symptoms?",
    "type": "multiselect",
    "options": [...]
  }
}
```

#### `POST /chat/ask`
Submit an answer to the current question.

**Request:**
```json
{
  "sessionId": "uuid",
  "answer": ["fever", "headache"]
}
```

**Response:**
```json
{
  "nextQuestion": {...},
  "completed": false
}
```

#### `POST /chat/recommend`
Get AI-powered medicine recommendation.

**Request:**
```json
{
  "sessionId": "uuid"
}
```

**Response:**
```json
{
  "recommendation": {
    "medicine": "Panadol",
    "reason": "...",
    "dosage": "..."
  }
}
```

#### `POST /chat/approve`
Approve recommendation and create order.

**Request:**
```json
{
  "sessionId": "uuid",
  "userId": 1,
  "medicineId": 1,
  "quantity": 2
}
```

**Response:**
```json
{
  "order": {...},
  "pointsEarned": 40
}
```

### User Management

#### `POST /ai-sihat/user`
Create a new user (auto-hashes password).

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123"
}
```

#### `GET /ai-sihat/user`
List all users.

#### `GET /ai-sihat/user/:id`
Get user by ID.

#### `PUT /ai-sihat/user/:id/points`
Update user loyalty points.

**Request:**
```json
{
  "points": 150
}
```

#### `DELETE /ai-sihat/user/:id`
Delete a user.

### Medicine Management

#### `POST /ai-sihat/medicines`
Create a new medicine.

**Request:**
```json
{
  "name": "Panadol",
  "type": "Painkiller",
  "quantity": 100
}
```

#### `GET /ai-sihat/medicines`
List all medicines.

**Query Parameters:**
- `type` - Filter by medicine type
- `inStock=true` - Show only medicines with quantity > 0

#### `GET /ai-sihat/medicines/:id`
Get medicine by ID.

#### `PUT /ai-sihat/medicines/:id`
Update medicine details.

#### `DELETE /ai-sihat/medicines/:id`
Delete a medicine.

### Order Management

#### `POST /ai-sihat/order`
Create a new order (auto-calculates points and updates user).

**Request:**
```json
{
  "userId": 1,
  "medicineId": 1,
  "quantity": 2,
  "aiConsultation": true
}
```

**Points Calculation:**
- Base: `quantity × 10`
- With AI consultation: `quantity × 10 × 2`

#### `GET /ai-sihat/order`
List all orders.

#### `GET /ai-sihat/order/:id`
Get order details with user and medicine information.

#### `DELETE /ai-sihat/order/:id`
Delete an order.

## Database Schema

### Users Table
```prisma
model users {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String   // bcrypt hashed
  points    Int      @default(0)
  createdAt DateTime @default(now())
  orders    orders[]
}
```

### Medicines Table
```prisma
model medicines {
  id        Int      @id @default(autoincrement())
  name      String
  type      String
  quantity  Int
  createdAt DateTime @default(now())
  orders    orders[]
}
```

### Orders Table
```prisma
model orders {
  id              Int       @id @default(autoincrement())
  userId          Int
  medicineId      Int
  quantity        Int
  pointsEarned    Int
  aiConsultation  Boolean   @default(false)
  createdAt       DateTime  @default(now())
  user            users     @relation(fields: [userId], references: [id])
  medicine        medicines @relation(fields: [medicineId], references: [id])
}
```

## Service Layer Details

### chatService.js
Orchestrates the chat flow:
- Loads questions from `symptoms.json`
- Manages question progression
- Collects user answers
- Triggers AI recommendations

### sessionService.js
In-memory session management:
- Creates and retrieves sessions
- Stores chat state (answers, current question)
- Session cleanup

### geminiService.js
Google Gemini AI integration:
- Analyzes collected symptoms
- Generates medicine recommendations
- Provides dosage and usage instructions

### userService.js
User business logic:
- User creation with password hashing
- Points management
- User queries and validation

### medicineService.js
Medicine business logic:
- CRUD operations
- Inventory management
- Type-based filtering

### orderService.js
Order processing:
- Order creation with validation
- Points calculation (base + AI consultation bonus)
- Automatic user points update

## Database Commands

```powershell
# Generate Prisma client after schema changes
npx prisma generate

# Push schema changes to database (development)
npx prisma db push

# Create a migration (production)
npx prisma migrate dev --name your_migration_name

# Open Prisma Studio (database GUI)
npx prisma studio
# Opens at http://localhost:5555

# Test database connection
node tests/test-db.js

# Reset database (warning: deletes all data)
npx prisma migrate reset
```

## Development Tips

1. **Nodemon** - Auto-restarts server on file changes in development
2. **Prisma Studio** - GUI for viewing and editing database records
3. **Error Handling** - All controllers include try-catch blocks
4. **Validation** - Use express-validator for input validation
5. **Testing** - Test endpoints using the client's API Test page or tools like Postman

## Troubleshooting

### Port Already in Use

```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

### Database Connection Issues

1. Verify `DATABASE_URL` in `.env`
2. Check Supabase project status
3. Test connection: `node tests/test-db.js`
4. Regenerate Prisma client: `npx prisma generate`

### Prisma Client Errors

```powershell
# Clear cache and regenerate
Remove-Item -Recurse -Force node_modules\.prisma
npx prisma generate
```

### Gemini API Errors

1. Verify `GEMINI_API_KEY` in `.env`
2. Check API key at https://aistudio.google.com/app/apikey
3. Ensure no rate limits are exceeded

## Security Considerations

- **Password Hashing** - Uses bcrypt with salt rounds
- **Environment Variables** - Never commit `.env` file
- **CORS** - Configure allowed origins in production
- **SQL Injection** - Protected by Prisma ORM
- **Input Validation** - Validate all user inputs

## Production Deployment

1. **Set Environment Variables**:
   - `NODE_ENV=production`
   - Use connection pooling for `DATABASE_URL`
   - Restrict `CORS_ORIGIN` to your frontend domain

2. **Run Migrations**:
   ```powershell
   npx prisma migrate deploy
   ```

3. **Start Server**:
   ```powershell
   npm start
   ```

## Next Steps

1. Set up your `.env` file with all required variables
2. Initialize the database with Prisma
3. Test the database connection
4. Start the development server
5. Use the frontend to test API endpoints

## Related Documentation

- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Google Gemini AI Documentation](https://ai.google.dev/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)

## Contributing

When adding new features:
1. Create services for business logic
2. Add controllers for request handling
3. Define routes in appropriate route files
4. Update Prisma schema if database changes are needed
5. Follow existing patterns and error handling practices
