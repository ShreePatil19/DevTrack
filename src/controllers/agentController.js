'use strict';

const ApplicationModel = require('../models/applicationModel');
const agentProxy = require('../services/agentProxyService');
const logger = require('../config/logger');

const analyzeJob = async (req, res, next) => {
    try {
        const { application_id } = req.body;

        const application = await ApplicationModel.findById(application_id, req.user.id);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const payload = {
            application_id,
            company_name: application.company_name,
            position_title: application.position_title,
            job_url: application.job_url || null,
            notes: application.notes || null,
            status: application.status,
            applied_date: application.applied_date,
        };

        const result = await agentProxy.analyzeJob(payload);
        res.status(200).json(result);
    } catch (err) {
        logger.error('Agent analyze error', { message: err.message, status: err.status });
        next(err);
    }
};

const getAgentRun = async (req, res, next) => {
    try {
        const { run_id } = req.params;
        const result = await agentProxy.getAgentRun(run_id);
        res.status(200).json(result);
    } catch (err) {
        logger.error('Agent run fetch error', { message: err.message, status: err.status });
        next(err);
    }
};

module.exports = { analyzeJob, getAgentRun };
