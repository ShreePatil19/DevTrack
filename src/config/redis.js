const { createClient } = require('redis');
const logger = require('./logger');

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis client connected'));
redisClient.on('reconnecting', () => logger.info('Redis client reconnecting'));

const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        logger.error('Failed to connect to Redis initially:', err);
    }
};

module.exports = {
    redisClient,
    connectRedis
};
