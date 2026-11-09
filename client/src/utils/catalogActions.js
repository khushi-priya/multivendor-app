export function catalogActions(item, { isAdmin = false, shopId = null, supportsActive = true } = {}) {
  const status = String(item?.submissionStatus ?? item?.approvalStatus ?? '').toLowerCase();
  const isOwnerSubmission = shopId != null && Number(item?.submittedByShopId) === Number(shopId);
  const ownerMayChange = isOwnerSubmission && ['pending', 'rejected'].includes(status);

  return {
    showEdit: true,
    showDelete: true,
    editEnabled: isAdmin || ownerMayChange,
    deleteEnabled: isAdmin || ownerMayChange,
    showStatus: true,
    statusEnabled: isAdmin && supportsActive && !['pending', 'rejected'].includes(status),
    reason: isAdmin || ownerMayChange
      ? ''
      : status === 'approved'
        ? 'Approved catalog entries are shared and managed by Super Admin.'
        : isOwnerSubmission
          ? 'Only your own pending or rejected submissions can be changed.'
          : 'This shared catalog record is managed by Super Admin.',
  };
}
