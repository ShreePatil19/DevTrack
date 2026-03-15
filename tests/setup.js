"use strict";

const db = require('../src/config/db');
const { redisClient } = require('../src/config/redis');

// Teardown connections after all tests
afterAll(async () => {
    await db.pool.end();
    if (redisClient.isOpen) {
        await redisClient.quit();
    }
});
