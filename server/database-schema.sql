-- AI-Sihat Database Schema
-- PostgreSQL Schema for Supabase
-- Generated: 2025-10-28
-- 
-- This file documents the database schema used by Sequelize models.
-- Sequelize will auto-create these tables on first run via sync().
-- You can also manually run this SQL in Supabase SQL Editor if needed.

-- =============================================================================
-- USERS TABLE
-- Stores user accounts with authentication and loyalty points
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,  -- bcrypt hashed
    points INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for faster email lookups (login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================================================
-- MEDICINES TABLE
-- Stores available medicine inventory
-- =============================================================================
CREATE TABLE IF NOT EXISTS medicines (
    medicine_id SERIAL PRIMARY KEY,
    medicine_name VARCHAR(50) NOT NULL,
    medicine_type VARCHAR(50) NOT NULL,
    medicine_quantity INTEGER NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for faster medicine searches
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(medicine_name);
CREATE INDEX IF NOT EXISTS idx_medicines_type ON medicines(medicine_type);

-- =============================================================================
-- ORDERS TABLE
-- Stores order history with points tracking and AI consultation flag
-- =============================================================================
CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    medicine_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('pickup', 'delivery')),
    use_ai BOOLEAN DEFAULT FALSE,  -- Whether AI consultation was used
    total_points INTEGER DEFAULT 0,  -- Points earned from this order
    status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id) ON DELETE RESTRICT
);

-- Indexes for faster order queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_medicine_id ON orders(medicine_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders("createdAt");

-- =============================================================================
-- SAMPLE DATA (Optional)
-- Uncomment to populate initial data for testing
-- =============================================================================

-- Sample Users
-- INSERT INTO users (username, email, password, points) VALUES
-- ('demo_user', 'demo@example.com', '$2b$10$abcdefghijklmnopqrstuvwxyz', 100),
-- ('test_user', 'test@example.com', '$2b$10$abcdefghijklmnopqrstuvwxyz', 50);

-- Sample Medicines
-- INSERT INTO medicines (medicine_name, medicine_type, medicine_quantity) VALUES
-- ('Paracetamol', 'Pain Relief', 100),
-- ('Ibuprofen', 'Anti-inflammatory', 75),
-- ('Amoxicillin', 'Antibiotic', 50),
-- ('Cetirizine', 'Antihistamine', 80),
-- ('Omeprazole', 'Antacid', 60);

-- Sample Orders
-- INSERT INTO orders (user_id, medicine_id, quantity, order_type, use_ai, total_points, status) VALUES
-- (1, 1, 2, 'pickup', TRUE, 40, 'completed'),
-- (1, 2, 1, 'delivery', FALSE, 10, 'completed'),
-- (2, 3, 3, 'pickup', TRUE, 60, 'pending');

-- =============================================================================
-- BUSINESS LOGIC NOTES
-- =============================================================================

-- Points Calculation:
-- - Base points: quantity × 10
-- - AI consultation bonus: base points × 2 (if use_ai = TRUE)
-- - Points are added to user.points when order is created
-- - Points are refunded if order is cancelled

-- Order Status Flow:
-- - pending → completed (normal flow)
-- - pending → cancelled (user cancellation)
-- - completed → (final state, cannot be changed)

-- Constraints:
-- - Email must be unique per user
-- - Orders cannot be created without valid user_id and medicine_id
-- - Order type must be 'pickup' or 'delivery'
-- - Order status must be 'pending', 'completed', or 'cancelled'
-- - Deleting a user cascades to their orders
-- - Deleting a medicine is restricted if it has orders

-- =============================================================================
-- MIGRATIONS / MODIFICATIONS
-- =============================================================================

-- If you need to modify tables after creation, add ALTER statements here:

-- Example: Add a new column to users
-- ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Example: Modify medicine_quantity to allow more stock
-- ALTER TABLE medicines ALTER COLUMN medicine_quantity TYPE BIGINT;

-- =============================================================================
-- SUPABASE-SPECIFIC NOTES
-- =============================================================================

-- Row Level Security (RLS):
-- You may want to enable RLS in Supabase for additional security:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Then create policies as needed, for example:
-- CREATE POLICY "Users can view their own data" ON users
--     FOR SELECT USING (auth.uid() = user_id::text);

-- CREATE POLICY "Anyone can view medicines" ON medicines
--     FOR SELECT TO authenticated, anon USING (true);

-- =============================================================================
-- CLEANUP / RESET (USE WITH CAUTION!)
-- =============================================================================

-- Uncomment to drop all tables and start fresh:
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS medicines CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
