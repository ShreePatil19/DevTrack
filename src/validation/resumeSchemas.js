'use strict';

const Joi = require('joi');

const createResumeSchema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
    file_url: Joi.string().uri().max(2048).required(),
    version: Joi.string().max(50).optional().default('1.0'),
    is_default: Joi.boolean().optional().default(false),
});

const updateResumeSchema = Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    file_url: Joi.string().uri().max(2048).optional(),
    version: Joi.string().max(50).optional(),
    is_default: Joi.boolean().optional(),
}).min(1);

module.exports = { createResumeSchema, updateResumeSchema };
