const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/admin/catalog', require('./admin-catalog.routes'));
router.use('/shop', require('./shop.routes'));
router.use('/delivery', require('./delivery.routes'));
router.use('/store', require('./store.routes'));
router.use('/customer', require('./customer.routes'));

module.exports = router;
