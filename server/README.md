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
PORT=8080
NODE_ENV=development

# Gemini AI (Required for chat recommendations)
# Get your API key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_api_key_here

# CORS Origins (comma-separated)
CORS_ORIGIN=http://localhost:5173

# Database Connection (Supabase)
# Get from Supabase: Project Settings → Database → Connection string

# Connection pooling for regular queries (port 6543)
DATABASE_URL=postgresql://postgres.PROJECT_ID:PASSWORD@aws-X-region.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct connection for migrations (port 5432)
DIRECT_URL=postgresql://postgres.PROJECT_ID:PASSWORD@aws-X-region.pooler.supabase.com:5432/postgres
```

**Important**: The `DIRECT_URL` is required for Prisma migrations to work properly with connection pooling.

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

# Push schema to database (creates tables)
npx prisma db push

# Optional: Open Prisma Studio to view data
npx prisma studio
```

**Note**: The schema uses:
- **CUID** for primary keys (random IDs instead of auto-increment)
- **String-based enums** for better PostgreSQL compatibility with connection pooling
- **camelCase** for all API fields and responses

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

Server will run on **http://localhost:8080** with auto-restart on file changes.

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
  "username": "John Doe",
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "userId": "clxxx...",
  "username": "John Doe",
  "email": "john@example.com",
  "points": 0,
  "createdAt": "2025-10-29T..."
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
  "medicineName": "Panadol",
  "medicineType": "Painkiller",
  "medicineQuantity": 100
}
```

**Response:**
```json
{
  "medicineId": "clxxx...",
  "medicineName": "Panadol",
  "medicineType": "Painkiller",
  "medicineQuantity": 100,
  "createdAt": "2025-10-29T..."
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
  "userId": "clxxx...",
  "medicineId": "clxxx...",
  "quantity": 2,
  "orderType": "pickup",
  "useAi": true
}
```

**Response:**
```json
{
  "message": "Order created successfully",
  "order": {
    "orderId": "clxxx...",
    "userId": "clxxx...",
    "medicineId": "clxxx...",
    "quantity": 2,
    "orderType": "pickup",
    "useAi": true,
    "totalPoints": 40,
    "status": "completed"
  },
  "updatedPoints": 140,
  "earnedPoints": 40
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
model User {
  userId    String   @id @default(cuid()) @map("user_id")
  username  String   @db.VarChar(50)
  email     String   @unique @db.VarChar(100)
  password  String   @db.VarChar(100)
  points    Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  orders    Order[]
  @@map("users")
}
```

### Medicines Table
```prisma
model Medicine {
  medicineId       String   @id @default(cuid()) @map("medicine_id")
  medicineName     String   @map("medicine_name") @db.VarChar(50)
  medicineType     String   @map("medicine_type") @db.VarChar(50)
  medicineQuantity Int      @map("medicine_quantity")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  orders           Order[]
  @@map("medicines")
}
```

### Orders Table
```prisma
model Order {
  orderId     String   @id @default(cuid()) @map("order_id")
  userId      String   @map("user_id")
  medicineId  String   @map("medicine_id")
  quantity    Int
  orderType   String   @map("order_type") @db.VarChar(20)
  useAi       Boolean  @default(false) @map("use_ai")
  totalPoints Int      @default(0) @map("total_points")
  status      String   @default("pending") @db.VarChar(20)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [userId], onDelete: Cascade)
  medicine    Medicine @relation(fields: [medicineId], references: [medicineId], onDelete: Restrict)
  @@map("orders")
}
```

**Key Changes:**
- **IDs**: Uses CUID (random strings) instead of auto-increment integers
- **Enums**: Replaced PostgreSQL enums with string types for pooling compatibility
- **Naming**: Field names use camelCase in Prisma, mapped to snake_case in database

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
6. **camelCase API** - All JSON fields use camelCase for consistency
7. **CUID IDs** - Primary keys are random strings (e.g., `clxxx...`) for better security
8. **Connection Pooling** - Uses Supabase pooler (port 6543) for queries, direct (port 5432) for migrations

## Troubleshooting

### Port Already in Use

```powershell
# Find process using port 8080
netstat -ano | findstr :8080

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
