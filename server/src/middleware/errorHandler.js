const { AppError } = require('../utils/errors');
const { randomUUID } = require('crypto');

function notFound(req, res, next) {
  next(new AppError(404, 'Not found'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ error: 'A record with these details already exists.' });
  }
  if (err.name === 'SequelizeValidationError') {
    return res.status(422).json({ error: 'The submitted data is invalid.' });
  }
  const requestId = randomUUID();
  // Keep request data and secrets out of logs while retaining the stack for diagnosis.
  console.error(
    `[error] requestId=${requestId} ${req.method} ${req.path}:`,
    err.stack || `${err.name}: ${err.message}`,
  );
  res.status(500).json({
    error: 'The server could not complete this request. Please try again.',
    requestId,
  });
}

module.exports = { notFound, errorHandler };
