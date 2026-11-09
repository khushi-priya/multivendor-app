const { AuditLog } = require('../models');

// Pass the active transaction so the audit entry commits/rolls back with the change.
async function audit({ actorId, action, entityType, entityId, shopId, meta, ip }, transaction) {
  return AuditLog.create(
    {
      actorUserId: actorId ?? null,
      action,
      entityType: entityType ?? null,
      entityId: entityId != null ? String(entityId) : null,
      shopId: shopId ?? null,
      meta: meta ?? null,
      ip: ip ?? null,
    },
    { transaction },
  );
}

module.exports = { audit };
