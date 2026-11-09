const { z } = require('zod');
const { AppError } = require('./errors');

// Validates req[source] against a zod schema; parsed data lands on req.valid.
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      (details[key] ||= []).push(issue.message);
    }
    return next(new AppError(422, 'Validation failed', details));
  }
  req.valid = result.data;
  next();
};

// '' -> undefined so optional form fields can be sent empty.
const optional = (schema) => z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional());

// Strips spaces and dashes before checking the phone format.
const phone = z.preprocess(
  (v) => (typeof v === 'string' ? v.replace(/[\s-]/g, '') : v),
  z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number (10-15 digits, optional +)'),
);

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

module.exports = { validate, optional, phone, password, z };
