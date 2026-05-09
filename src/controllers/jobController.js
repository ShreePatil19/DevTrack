const JobModel = require('../models/jobModel');
const { redisClient } = require('../config/redis');

const JOBS_CACHE_KEY = 'jobs:active';
const CACHE_TTL = 300; // 5 minutes

const getJobs = async (req, res, next) => {
    try {
        const { search, location, limit = 50, offset = 0 } = req.query;
        const useCache = !search && !location && offset === 0 || offset === '0';

        if (useCache && redisClient.isReady) {
            const cached = await redisClient.get(JOBS_CACHE_KEY);
            if (cached) {
                return res.status(200).json({ ...JSON.parse(cached), source: 'cache' });
            }
        }

        const result = await JobModel.findAll({
            search,
            location,
            limit: Math.min(parseInt(limit, 10) || 50, 100),
            offset: parseInt(offset, 10) || 0,
        });

        if (useCache && redisClient.isReady) {
            await redisClient.setEx(JOBS_CACHE_KEY, CACHE_TTL, JSON.stringify(result));
        }

        res.status(200).json({ ...result, source: 'db' });
    } catch (error) {
        next(error);
    }
};

const getJobById = async (req, res, next) => {
    try {
        const job = await JobModel.findById(req.params.id);
        if (!job) return res.status(404).json({ error: 'Job not found' });
        res.status(200).json({ job });
    } catch (error) {
        next(error);
    }
};

const createJob = async (req, res, next) => {
    try {
        const job = await JobModel.create(req.body);
        if (redisClient.isReady) await redisClient.del(JOBS_CACHE_KEY);
        res.status(201).json({ message: 'Job created', job });
    } catch (error) {
        next(error);
    }
};

const updateJob = async (req, res, next) => {
    try {
        const job = await JobModel.update(req.params.id, req.body);
        if (!job) return res.status(404).json({ error: 'Job not found' });
        if (redisClient.isReady) await redisClient.del(JOBS_CACHE_KEY);
        res.status(200).json({ message: 'Job updated', job });
    } catch (error) {
        next(error);
    }
};

const deleteJob = async (req, res, next) => {
    try {
        const deleted = await JobModel.delete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Job not found' });
        if (redisClient.isReady) await redisClient.del(JOBS_CACHE_KEY);
        res.status(200).json({ message: 'Job deleted' });
    } catch (error) {
        next(error);
    }
};

module.exports = { getJobs, getJobById, createJob, updateJob, deleteJob };
