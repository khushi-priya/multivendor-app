const fs = require('fs/promises');
const path = require('path');
const { PUBLIC_DIR } = require('./uploads');
const { Category, Subcategory, Brand, ProductImage } = require('../models');

async function removeImageIfUnused(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const stillUsed = await Promise.all([
    Category.count({ where: { imageUrl: url } }),
    Subcategory.count({ where: { imageUrl: url } }),
    Brand.count({ where: { imageUrl: url } }),
    ProductImage.count({ where: { imageUrl: url } }),
  ]);
  if (stillUsed.some(Boolean)) return;
  const filePath = path.resolve(PUBLIC_DIR, path.basename(url));
  if (!filePath.startsWith(`${path.resolve(PUBLIC_DIR)}${path.sep}`)) return;
  try { await fs.unlink(filePath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}

module.exports = { removeImageIfUnused };
