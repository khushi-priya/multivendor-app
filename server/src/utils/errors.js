class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Forward async errors to Express' error handler.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Parse a numeric :param safely.
function idParam(req, name) {
  const n = Number(req.params[name]);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, `Invalid ${name}`);
  return n;
}

module.exports = { AppError, wrap, idParam };
