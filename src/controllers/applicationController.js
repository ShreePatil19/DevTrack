const ApplicationModel = require('../models/applicationModel');
const { redisClient } = require('../config/redis');

// Helper to get cache key
const getCacheKey = (userId) => `apps:${userId}`;

const getApplications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cacheKey = getCacheKey(userId);

        // Try getting from cache
        if (redisClient.isReady) {
            const cachedApps = await redisClient.get(cacheKey);
            if (cachedApps) {
                return res.status(200).json({ applications: JSON.parse(cachedApps), source: 'cache' });
            }
        }

        const applications = await ApplicationModel.findAllByUserId(userId);

        // Save to cache (valid for 5 minutes)
        if (redisClient.isReady) {
            await redisClient.setEx(cacheKey, 300, JSON.stringify(applications));
        }

        res.status(200).json({ applications, source: 'db' });
    } catch (error) {
        next(error);
    }
};

const getApplicationById = async (req, res, next) => {
    try {
         const application = await ApplicationModel.findById(req.params.id, req.user.id);
         if (!application) {
             return res.status(404).json({ error: 'Application not found' });
         }
         res.status(200).json({ application });
    } catch (error) {
        next(error);
    }
};

const createApplication = async (req, res, next) => {
    try {
        if (!req.body.company_name || !req.body.position_title) {
            return res.status(400).json({ error: 'company_name and position_title are required' });
        }

        const newApp = await ApplicationModel.create(req.user.id, req.body);
        
        // Invalidate cache
        if (redisClient.isReady) {
            await redisClient.del(getCacheKey(req.user.id));
        }

        res.status(201).json({ message: 'Application created successfully', application: newApp });
    } catch (error) {
        next(error);
    }
};

const updateApplication = async (req, res, next) => {
    try {
        const updatedApp = await ApplicationModel.update(req.params.id, req.user.id, req.body);
        if (!updatedApp) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Invalidate cache
        if (redisClient.isReady) {
            await redisClient.del(getCacheKey(req.user.id));
        }

        res.status(200).json({ message: 'Application updated', application: updatedApp });
    } catch (error) {
        next(error);
    }
};

const deleteApplication = async (req, res, next) => {
    try {
        const deleted = await ApplicationModel.delete(req.params.id, req.user.id);
        if (!deleted) {
             return res.status(404).json({ error: 'Application not found' });
        }

        // Invalidate cache
        if (redisClient.isReady) {
            await redisClient.del(getCacheKey(req.user.id));
        }

        res.status(200).json({ message: 'Application deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getApplications,
    getApplicationById,
    createApplication,
    updateApplication,
    deleteApplication
};
