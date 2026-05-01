"use strict";

const db = require('../src/config/db');
const { redisClient, connectRedis } = require('../src/config/redis');
const { initDbSchema } = require('../src/models/init');

// Initialize schema before any test runs.
// Tests import the Express app directly, bypassing server.js where
// initDbSchema() and connectRedis() normally run on startup.
beforeAll(async () => {
    await initDbSchema();
    if (!redisClient.isOpen) {
        await connectRedis();
    }
});

// Teardown connections after all tests
afterAll(async () => {
    await db.pool.end();
    if (redisClient.isOpen) {
        await redisClient.quit();
    }
});
