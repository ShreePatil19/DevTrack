'use strict';

const Joi = require('joi');

const VALID_STATUSES = ['applied', 'screening', 'interviewing', 'offer', 'rejected', 'withdrawn'];

const createApplicationSchema = Joi.object({
    company_name: Joi.string().min(1).max(255).required(),
    position_title: Joi.string().min(1).max(255).required(),
    status: Joi.string().valid(...VALID_STATUSES).default('applied'),
    job_url: Joi.string().uri().max(2048).optional().allow('', null),
    notes: Joi.string().max(5000).optional().allow('', null),
    applied_date: Joi.date().iso().optional().allow(null),
});

const updateApplicationSchema = Joi.object({
    company_name: Joi.string().min(1).max(255).optional(),
    position_title: Joi.string().min(1).max(255).optional(),
    status: Joi.string().valid(...VALID_STATUSES).optional(),
    job_url: Joi.string().uri().max(2048).optional().allow('', null),
    notes: Joi.string().max(5000).optional().allow('', null),
    applied_date: Joi.date().iso().optional().allow(null),
}).min(1);

module.exports = { createApplicationSchema, updateApplicationSchema };
