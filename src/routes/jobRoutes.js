'use strict';

const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { createJobSchema, updateJobSchema } = require('../validation/jobSchemas');
const { getJobs, getJobById, createJob, updateJob, deleteJob } = require('../controllers/jobController');

const router = express.Router();

router.use(authenticateToken);

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: List active job postings
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title, company, or description
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Paginated list of jobs
 */
router.get('/', getJobs);

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get a specific job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job object
 *       404:
 *         description: Job not found
 */
router.get('/:id', getJobById);

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Add a new job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, company]
 *             properties:
 *               title:
 *                 type: string
 *               company:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               job_url:
 *                 type: string
 *               source:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', validate(createJobSchema), createJob);

/**
 * @swagger
 * /api/jobs/{id}:
 *   put:
 *     summary: Update a job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', validate(updateJobSchema), updateJob);

/**
 * @swagger
 * /api/jobs/{id}:
 *   delete:
 *     summary: Delete a job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', deleteJob);

module.exports = router;
