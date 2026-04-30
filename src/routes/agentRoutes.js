'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { analyzeSchema } = require('../validation/agentSchemas');
const { analyzeJob, getAgentRun } = require('../controllers/agentController');

const router = express.Router();

// Agents are expensive — tighter per-route limit: 20/hour per IP
const agentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { error: 'Agent rate limit reached. Try again in an hour.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.use(authenticateToken);
router.use(agentLimiter);

/**
 * @swagger
 * /api/agents/analyze:
 *   post:
 *     summary: Run the Job Intelligence agent on an application
 *     description: Triggers a LangGraph 4-node workflow — fetches profile, fetches JD, runs gap analysis, generates talking points. Returns execution trace metadata.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [application_id]
 *             properties:
 *               application_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the job application to analyze
 *     responses:
 *       200:
 *         description: Analysis result with execution metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     gap_analysis:
 *                       type: object
 *                     talking_points:
 *                       type: array
 *                       items:
 *                         type: string
 *                 execution_metadata:
 *                   type: object
 *                   properties:
 *                     run_id:
 *                       type: string
 *                     token_cost_usd:
 *                       type: number
 *                     duration_ms:
 *                       type: number
 *                     circuit_breaker_triggered:
 *                       type: boolean
 *       404:
 *         description: Application not found
 *       504:
 *         description: Agent service timed out
 */
router.post('/analyze', validate(analyzeSchema), analyzeJob);

/**
 * @swagger
 * /api/agents/runs/{run_id}:
 *   get:
 *     summary: Get full state transition trace for an agent run
 *     description: Returns every node's input/output from the LangGraph execution. Use this to inspect agent reasoning and debug failures.
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: run_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Full state transition trace
 *       404:
 *         description: Run not found
 */
router.get('/runs/:run_id', getAgentRun);

module.exports = router;
