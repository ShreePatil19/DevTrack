const { Pool } = require('pg');
const logger = require('./logger');

const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    max: 20, // Max clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Allow connection string for Render / Neon / Supabase deployments
if (process.env.DATABASE_URL) {
    dbConfig.connectionString = process.env.DATABASE_URL;
    // SSL is required by managed DBs (Neon, Supabase) but breaks against
    // CI postgres service containers and local docker-compose (plain TCP).
    // Opt in via NODE_ENV=production OR DB_SSL=true.
    if (process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true') {
        dbConfig.ssl = { rejectUnauthorized: false };
    }
}

const pool = new Pool(dbConfig);

pool.on('error', (err, client) => {
    logger.error('Unexpected error on idle client', { error: err.message, stack: err.stack });
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    pool,
};
