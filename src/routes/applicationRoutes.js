const express = require('express');
const { 
    getApplications,
    getApplicationById,
    createApplication,
    updateApplication,
    deleteApplication
} = require('../controllers/applicationController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken); // Protect all application routes

/**
 * @swagger
 * /api/applications:
 *   get:
 *     summary: Get all applications for the current user
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of applications
 */
router.get('/', getApplications);

/**
 * @swagger
 * /api/applications/{id}:
 *   get:
 *     summary: Get a specific application
 *     tags: [Applications]
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
 *         description: Application object
 *       404:
 *         description: Application not found
 */
router.get('/:id', getApplicationById);

/**
 * @swagger
 * /api/applications:
 *   post:
 *     summary: Create a new job application
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company_name
 *               - position_title
 *             properties:
 *               company_name:
 *                 type: string
 *               position_title:
 *                 type: string
 *               status:
 *                 type: string
 *               job_url:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', createApplication);

/**
 * @swagger
 * /api/applications/{id}:
 *   put:
 *     summary: Update an application
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company_name:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', updateApplication);

/**
 * @swagger
 * /api/applications/{id}:
 *   delete:
 *     summary: Delete an application
 *     tags: [Applications]
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
router.delete('/:id', deleteApplication);

module.exports = router;
