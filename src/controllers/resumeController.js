const ResumeModel = require('../models/resumeModel');
const { redisClient } = require('../config/redis');

const getCacheKey = (userId) => `resumes:${userId}`;

const getResumes = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cacheKey = getCacheKey(userId);

        if (redisClient.isReady) {
            const cached = await redisClient.get(cacheKey);
            if (cached) return res.status(200).json({ resumes: JSON.parse(cached), source: 'cache' });
        }

        const resumes = await ResumeModel.findAllByUserId(userId);

        if (redisClient.isReady) {
            await redisClient.setEx(cacheKey, 300, JSON.stringify(resumes));
        }

        res.status(200).json({ resumes, source: 'db' });
    } catch (error) {
        next(error);
    }
};

const getResumeById = async (req, res, next) => {
    try {
        const resume = await ResumeModel.findById(req.params.id, req.user.id);
        if (!resume) return res.status(404).json({ error: 'Resume not found' });
        res.status(200).json({ resume });
    } catch (error) {
        next(error);
    }
};

const createResume = async (req, res, next) => {
    try {
        const resume = await ResumeModel.create(req.user.id, req.body);
        if (redisClient.isReady) await redisClient.del(getCacheKey(req.user.id));
        res.status(201).json({ message: 'Resume created', resume });
    } catch (error) {
        next(error);
    }
};

const updateResume = async (req, res, next) => {
    try {
        const resume = await ResumeModel.update(req.params.id, req.user.id, req.body);
        if (!resume) return res.status(404).json({ error: 'Resume not found' });
        if (redisClient.isReady) await redisClient.del(getCacheKey(req.user.id));
        res.status(200).json({ message: 'Resume updated', resume });
    } catch (error) {
        next(error);
    }
};

const deleteResume = async (req, res, next) => {
    try {
        const deleted = await ResumeModel.delete(req.params.id, req.user.id);
        if (!deleted) return res.status(404).json({ error: 'Resume not found' });
        if (redisClient.isReady) await redisClient.del(getCacheKey(req.user.id));
        res.status(200).json({ message: 'Resume deleted' });
    } catch (error) {
        next(error);
    }
};

const setDefaultResume = async (req, res, next) => {
    try {
        const resume = await ResumeModel.setDefault(req.params.id, req.user.id);
        if (!resume) return res.status(404).json({ error: 'Resume not found' });
        if (redisClient.isReady) await redisClient.del(getCacheKey(req.user.id));
        res.status(200).json({ message: 'Default resume set', resume });
    } catch (error) {
        next(error);
    }
};

module.exports = { getResumes, getResumeById, createResume, updateResume, deleteResume, setDefaultResume };
