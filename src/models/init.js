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

            CREATE TABLE IF NOT EXISTS jobs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                company VARCHAR(255) NOT NULL,
                description TEXT,
                location VARCHAR(255),
                job_url TEXT,
                source VARCHAR(100) DEFAULT 'manual',
                is_active BOOLEAN DEFAULT TRUE,
                posted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS resumes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                file_url TEXT NOT NULL,
                version VARCHAR(50) DEFAULT '1.0',
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Composite Indexes for faster querying
            CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status);
            CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(user_id, company_name);
            CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_active, posted_at DESC);
            CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id, is_default);
        `);
        logger.info('Database schema initialized successfully.');
    } catch (error) {
        logger.error('Failed to initialize database schema:', error);
        throw error;
    }
};

module.exports = { initDbSchema };
