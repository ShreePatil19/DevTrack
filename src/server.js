require('dotenv').config();
const app = require('./app');
const logger = require('./config/logger');

const PORT = process.env.PORT || 3000;

const { initDbSchema } = require('./models/init');
const { connectRedis } = require('./config/redis');

const startServer = async () => {
    try {
        await initDbSchema();
        await connectRedis();
        
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
        });
    } catch (error) {
        logger.error(`Error starting server: ${error.message}`);
        process.exit(1);
    }
};

startServer();
