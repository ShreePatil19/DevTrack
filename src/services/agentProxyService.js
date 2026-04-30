'use strict';

const logger = require('../config/logger');

const AGENTS_SERVICE_URL = process.env.AGENTS_SERVICE_URL || 'http://localhost:8000';
const AGENT_TIMEOUT_MS = 120_000;

const callAgentService = async (path, payload) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

    try {
        const response = await fetch(`${AGENTS_SERVICE_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        if (!response.ok) {
            const body = await response.text();
            const err = new Error(`Agent service error: ${body}`);
            err.status = response.status === 422 ? 400 : 502;
            throw err;
        }

        return await response.json();
    } catch (err) {
        if (err.name === 'AbortError') {
            const timeout = new Error('Agent service timed out');
            timeout.status = 504;
            throw timeout;
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
};

const getAgentRun = async (runId) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
        const response = await fetch(`${AGENTS_SERVICE_URL}/agents/runs/${runId}`, {
            signal: controller.signal,
        });

        if (!response.ok) {
            if (response.status === 404) {
                const err = new Error('Run not found');
                err.status = 404;
                throw err;
            }
            const err = new Error('Agent service error');
            err.status = 502;
            throw err;
        }

        return await response.json();
    } catch (err) {
        if (err.name === 'AbortError') {
            const timeout = new Error('Agent service timed out');
            timeout.status = 504;
            throw timeout;
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
};

const analyzeJob = (payload) => callAgentService('/agents/analyze', payload);

module.exports = { analyzeJob, getAgentRun };
