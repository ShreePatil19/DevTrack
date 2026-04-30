require('dotenv').config();
const app = require('./app');
const logger = require('./config/logger');
const { initDbSchema } = require('./models/init');
const { connectRedis, redisClient } = require('./config/redis');
const db = require('./config/db');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await initDbSchema();
        await connectRedis();

        const server = app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
        });

        const shutdown = async (signal) => {
            logger.info(`${signal} received, shutting down gracefully...`);
            server.close(async () => {
                logger.info('HTTP server closed');
                try {
                    if (redisClient.isOpen) await redisClient.quit();
                    await db.pool.end();
                    logger.info('All connections closed');
                    process.exit(0);
                } catch (err) {
                    logger.error('Error during shutdown', { message: err.message });
                    process.exit(1);
                }
            });
            // Force exit if connections don't drain within 15s
            setTimeout(() => process.exit(1), 15_000).unref();
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        logger.error(`Error starting server: ${error.message}`);
        process.exit(1);
    }
};

startServer();
