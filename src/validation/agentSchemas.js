'use strict';

const Joi = require('joi');

const analyzeSchema = Joi.object({
    application_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
});

module.exports = { analyzeSchema };
