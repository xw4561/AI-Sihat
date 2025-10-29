# Prisma Setup Guide

This guide will help you set up and manage the PostgreSQL database using Prisma ORM for the AI-Sihat application.

## What is Prisma?

Prisma is a modern database toolkit that provides:
- **Type-safe database client** - Auto-generated TypeScript types
- **Database migrations** - Version control for your database schema
- **Prisma Studio** - Visual database browser and editor
- **Query builder** - Intuitive API for database operations

## Prerequisites

- Node.js installed
- PostgreSQL database (Supabase or local)
- `server/.env` file with `DATABASE_URL`

## Database Schema Overview

The AI-Sihat application uses three main models:

### Users
- User accounts with authentication
- Loyalty points system
- Email-based login

### Medicines
- Medicine inventory management
- Type categorization (Painkiller, Antibiotic, etc.)
- Quantity tracking

### Orders
- Order history with user and medicine relations
- Points calculation (quantity × 10, doubled with AI consultation)
- Status tracking (pending, completed, cancelled)
- Order types (pickup, delivery)

## Quick Setup

### 1. Configure Database Connection

Create or update `server/.env`:

```env
# Supabase (Recommended)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres

# Or use connection pooling for production
DATABASE_URL=postgresql://postgres.PROJECT_ID:PASSWORD@aws-X-region.pooler.supabase.com:6543/postgres?pgbouncer=true

# Local PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_sihat
```

### 2. Generate Prisma Client

This creates the Prisma Client based on your schema:

```powershell
cd server
npx prisma generate
```

**When to run:**
- After first installation
- After modifying `schema.prisma`
- After pulling schema changes from Git

### 3. Initialize Database

Push the schema to your database (creates tables):

```powershell
npx prisma db push
```

**Use case:** Development and quick prototyping without migration history.

### 4. Test Connection

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

## Database Setup Options

### Option A: Supabase (Recommended for Cloud)

**Advantages:**
- Free tier available
- Automatic backups
- Built-in dashboard
- Connection pooling
- No server maintenance

**Setup Steps:**

1. **Create Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up and create a new project
   - Wait for database provisioning (~2 minutes)

2. **Get Connection String**
   - Navigate to **Project Settings** → **Database**
   - Scroll to **Connection string**
   - Choose **URI** format
   - Copy the connection string

3. **Configure Environment**
   ```env
   # Direct connection (development)
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   
   # Connection pooling (production recommended)
   DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

4. **Initialize Schema**
   ```powershell
   npx prisma db push
   ```

**Supabase Dashboard:**
- View tables: **Table Editor** tab
- Run SQL: **SQL Editor** tab
- Monitor: **Database** → **Logs**

### Option B: Local PostgreSQL

**Advantages:**
- Full control
- No internet dependency
- Faster development

**Setup Steps:**

1. **Install PostgreSQL**
   - Download from [postgresql.org](https://www.postgresql.org/download/)
   - Install with default settings
   - Remember your postgres password

2. **Create Database**
   ```powershell
   # Open psql
   psql -U postgres
   
   # In psql:
   CREATE DATABASE ai_sihat;
   \q
   ```

3. **Configure Environment**
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/ai_sihat
   ```

4. **Initialize Schema**
   ```powershell
   npx prisma db push
   ```

## Prisma Commands

### Essential Commands

```powershell
# Generate Prisma Client (after schema changes)
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Open Prisma Studio (visual editor)
npx prisma studio
# Opens at http://localhost:5555

# Validate schema file
npx prisma validate

# Format schema file
npx prisma format
```

### Migration Commands (Production)

```powershell
# Create a new migration
npx prisma migrate dev --name add_user_table

# Apply pending migrations
npx prisma migrate deploy

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# View migration status
npx prisma migrate status

# Create migration from schema changes
npx prisma migrate dev
```

### Database Commands

```powershell
# Pull schema from existing database
npx prisma db pull

# Push schema without migrations
npx prisma db push

# Seed database (if seed file exists)
npx prisma db seed
```

## Workflow Guide

### Development Workflow

1. **Make Schema Changes**
   ```prisma
   // Edit server/prisma/schema.prisma
   model User {
     // Add new field
     phoneNumber String?
   }
   ```

2. **Push to Database**
   ```powershell
   npx prisma db push
   ```

3. **Generate Client**
   ```powershell
   npx prisma generate
   ```

4. **Test Changes**
   ```powershell
   node tests/test-db.js
   ```

### Production Workflow

1. **Create Migration**
   ```powershell
   npx prisma migrate dev --name your_change_description
   ```

2. **Review Migration SQL**
   - Check `prisma/migrations/` folder
   - Verify SQL statements

3. **Commit Migration**
   ```bash
   git add prisma/migrations
   git commit -m "Add migration: your_change_description"
   ```

4. **Deploy to Production**
   ```powershell
   npx prisma migrate deploy
   ```

## Prisma Studio

Prisma Studio is a visual database browser.

**Start Prisma Studio:**
```powershell
npx prisma studio
```

**Features:**
- 📊 View all tables and records
- ✏️ Create, edit, delete records
- 🔍 Filter and search data
- 🔗 Navigate relationships
- 📝 No SQL required

**Access:** http://localhost:5555

## Common Tasks

### Add a New Model

1. Edit `schema.prisma`:
   ```prisma
   model Feedback {
     id        Int      @id @default(autoincrement())
     userId    Int      @map("user_id")
     content   String
     rating    Int
     createdAt DateTime @default(now())
     
     user      User     @relation(fields: [userId], references: [userId])
     
     @@map("feedbacks")
   }
   ```

2. Update User model:
   ```prisma
   model User {
     // ... existing fields
     feedbacks Feedback[]
   }
   ```

3. Push changes:
   ```powershell
   npx prisma db push
   npx prisma generate
   ```

### Add a New Field

1. Edit model in `schema.prisma`:
   ```prisma
   model User {
     // ... existing fields
     phoneNumber String? @map("phone_number") @db.VarChar(20)
   }
   ```

2. Push changes:
   ```powershell
   npx prisma db push
   ```

### Modify a Field

1. Update in `schema.prisma`:
   ```prisma
   model User {
     // Change from optional to required
     phoneNumber String @map("phone_number") @db.VarChar(20)
   }
   ```

2. Push changes:
   ```powershell
   npx prisma db push
   # Prisma will warn about data loss if field was nullable
   ```

### Delete a Model/Field

1. Remove from `schema.prisma`
2. Push changes:
   ```powershell
   npx prisma db push
   ```

## Using Prisma Client in Code

The Prisma Client is already configured in `server/prisma/client.js`:

```javascript
import prisma from './prisma/client.js';

// Create a user
const user = await prisma.user.create({
  data: {
    username: 'john_doe',
    email: 'john@example.com',
    password: hashedPassword,
  },
});

// Find users
const users = await prisma.user.findMany({
  where: {
    points: {
      gte: 100,
    },
  },
  include: {
    orders: true,
  },
});

// Update user
await prisma.user.update({
  where: { userId: 1 },
  data: { points: 150 },
});

// Delete user
await prisma.user.delete({
  where: { userId: 1 },
});
```

## Troubleshooting

### "Environment variable not found: DATABASE_URL"

**Solution:**
```powershell
# Ensure .env file exists in server/ directory
cd server
echo $env:DATABASE_URL  # Should show your connection string
```

### "Can't reach database server"

**Solutions:**
1. Check if database is running (local) or accessible (Supabase)
2. Verify `DATABASE_URL` is correct
3. Check firewall/network settings
4. For Supabase: Verify project is not paused

**Test connection:**
```powershell
node tests/test-db.js
```

### "Prisma Client did not initialize yet"

**Solution:**
```powershell
npx prisma generate
```

### Migration conflicts

**Solution:**
```powershell
# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Or manually resolve in database then:
npx prisma migrate resolve --applied "migration_name"
```

### Schema validation errors

**Solution:**
```powershell
# Validate schema
npx prisma validate

# Format schema
npx prisma format
```

### "Column does not exist" after schema changes

**Solution:**
```powershell
# Push schema changes
npx prisma db push

# Regenerate client
npx prisma generate

# Restart server
npm run dev
```

## Schema File Conventions

### Naming Conventions

**Models:** PascalCase
```prisma
model User { }
model OrderItem { }
```

**Fields:** camelCase
```prisma
userId
medicineType
createdAt
```

**Database columns:** snake_case (using @map)
```prisma
userId    Int    @map("user_id")
```

**Tables:** snake_case plural (using @@map)
```prisma
@@map("users")
@@map("order_items")
```

### Field Types

Common Prisma types:
- `Int` - Integer
- `String` - Variable-length text
- `Boolean` - True/false
- `DateTime` - Timestamp
- `Float` - Decimal number
- `Json` - JSON data

Database-specific types:
- `@db.VarChar(50)` - Variable character (max 50)
- `@db.Text` - Unlimited text
- `@db.Timestamp` - Timestamp with timezone

### Constraints and Modifiers

```prisma
@id                          // Primary key
@default(autoincrement())    // Auto-increment
@default(now())              // Default to current timestamp
@unique                      // Unique constraint
@updatedAt                   // Auto-update on changes
@map("column_name")          // Map to different column name
@@map("table_name")          // Map to different table name
@@index([field])             // Create index
```

## Performance Tips

1. **Use Indexes** - Add indexes for frequently queried fields:
   ```prisma
   @@index([email])
   @@index([createdAt])
   ```

2. **Connection Pooling** - Use Supabase's connection pooler for production

3. **Select Specific Fields** - Don't fetch unnecessary data:
   ```javascript
   const users = await prisma.user.findMany({
     select: {
       userId: true,
       username: true,
       // Don't fetch password
     },
   });
   ```

4. **Pagination** - Use `skip` and `take`:
   ```javascript
   const users = await prisma.user.findMany({
     skip: 20,
     take: 10, // Page 3 (items 21-30)
   });
   ```

## Security Best Practices

1. **Never commit .env file** - Add to `.gitignore`
2. **Use environment variables** - Never hardcode credentials
3. **Restrict database permissions** - Use role-based access
4. **Use connection pooling** - Prevent connection exhaustion
5. **Validate inputs** - Always validate before database operations
6. **Use parameterized queries** - Prisma does this automatically

## Resources

- **Prisma Documentation**: https://www.prisma.io/docs/
- **Prisma Schema Reference**: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference
- **Prisma Client API**: https://www.prisma.io/docs/reference/api-reference/prisma-client-reference
- **Supabase Documentation**: https://supabase.com/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/

## Quick Reference Card

```powershell
# Setup
npx prisma generate        # Generate client
npx prisma db push         # Push schema to DB

# Development
npx prisma studio          # Visual editor
npx prisma format          # Format schema
npx prisma validate        # Validate schema

# Migrations (Production)
npx prisma migrate dev     # Create migration
npx prisma migrate deploy  # Apply migrations

# Troubleshooting
node tests/test-db.js      # Test connection
npx prisma migrate reset   # Reset database
```

## Getting Help

If you encounter issues:

1. Check this README first
2. Run `node tests/test-db.js` to diagnose
3. Review Prisma logs in terminal
4. Check Supabase dashboard (if using Supabase)
5. Consult the main [server/README.md](../README.md)
