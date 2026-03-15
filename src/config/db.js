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

// Allow connection string for render / neon deployments
if (process.env.DATABASE_URL) {
    dbConfig.connectionString = process.env.DATABASE_URL;
    dbConfig.ssl = { rejectUnauthorized: false }; // Required for many hosted DBs
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
