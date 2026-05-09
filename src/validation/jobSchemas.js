'use strict';

const Joi = require('joi');

const createJobSchema = Joi.object({
    title: Joi.string().min(1).max(255).required(),
    company: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(10000).optional().allow('', null),
    location: Joi.string().max(255).optional().allow('', null),
    job_url: Joi.string().uri().max(2048).optional().allow('', null),
    source: Joi.string().max(100).optional().default('manual'),
});

const updateJobSchema = Joi.object({
    title: Joi.string().min(1).max(255).optional(),
    company: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(10000).optional().allow('', null),
    location: Joi.string().max(255).optional().allow('', null),
    job_url: Joi.string().uri().max(2048).optional().allow('', null),
    is_active: Joi.boolean().optional(),
}).min(1);

module.exports = { createJobSchema, updateJobSchema };
