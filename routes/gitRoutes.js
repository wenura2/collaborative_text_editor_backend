const express = require('express');
const router = express.Router();
const { init, clone, commit, push, pull, status, getLog, getBranches, checkout} = require('../controllers/gitController');
const { isAuthenticated } = require('../middleware/auth');

router.post('/init', isAuthenticated, init);
router.post('/clone', isAuthenticated, clone);
router.post('/commit', isAuthenticated, commit);
router.post('/push', isAuthenticated, push);
router.post('/pull', isAuthenticated, pull);
router.get('/status', isAuthenticated, status);
router.get('/log', isAuthenticated, getLog);
router.get('/branches', isAuthenticated, getBranches);
router.post('/checkout', isAuthenticated, checkout);

module.exports = router;
