const db = require('../config/db');
const logger = require('../config/logger');

const initDbSchema = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS applications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                company_name VARCHAR(255) NOT NULL,
                position_title VARCHAR(255) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'applied',
                job_url TEXT,
                notes TEXT,
                applied_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS status_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
                previous_status VARCHAR(50),
                new_status VARCHAR(50) NOT NULL,
                changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                notes TEXT
            );

            -- Composite Indexes for faster querying
            CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status);
            CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(user_id, company_name);
        `);
        logger.info('Database schema initialized successfully.');
    } catch (error) {
        logger.error('Failed to initialize database schema:', error);
        throw error;
    }
};

module.exports = { initDbSchema };
