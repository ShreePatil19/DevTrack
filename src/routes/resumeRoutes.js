'use strict';

const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { createResumeSchema, updateResumeSchema } = require('../validation/resumeSchemas');
const {
    getResumes, getResumeById, createResume, updateResume, deleteResume, setDefaultResume
} = require('../controllers/resumeController');

const router = express.Router();

router.use(authenticateToken);

/**
 * @swagger
 * /api/resumes:
 *   get:
 *     summary: List all resumes for the current user
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of resumes
 */
router.get('/', getResumes);

/**
 * @swagger
 * /api/resumes/{id}:
 *   get:
 *     summary: Get a specific resume
 *     tags: [Resumes]
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
 *         description: Resume object
 *       404:
 *         description: Resume not found
 */
router.get('/:id', getResumeById);

/**
 * @swagger
 * /api/resumes:
 *   post:
 *     summary: Add a resume
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, file_url]
 *             properties:
 *               name:
 *                 type: string
 *               file_url:
 *                 type: string
 *               version:
 *                 type: string
 *               is_default:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', validate(createResumeSchema), createResume);

/**
 * @swagger
 * /api/resumes/{id}:
 *   put:
 *     summary: Update a resume
 *     tags: [Resumes]
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
router.put('/:id', validate(updateResumeSchema), updateResume);

/**
 * @swagger
 * /api/resumes/{id}/default:
 *   patch:
 *     summary: Set a resume as the default
 *     tags: [Resumes]
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
 *         description: Default resume updated
 */
router.patch('/:id/default', setDefaultResume);

/**
 * @swagger
 * /api/resumes/{id}:
 *   delete:
 *     summary: Delete a resume
 *     tags: [Resumes]
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
router.delete('/:id', deleteResume);

module.exports = router;
