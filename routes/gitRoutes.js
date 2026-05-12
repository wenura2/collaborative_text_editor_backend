const express = require('express');
const router = express.Router();
const { init, clone, commit, push, pull, status, getLog, getBranches, checkout} = require('../controllers/gitController');

// Git operations - Auth can be added later if needed
// For now, allowing public access for testing purposes
router.post('/init', init);
router.post('/clone', clone);
router.post('/commit', commit);
router.post('/push', push);
router.post('/pull', pull);
router.get('/status', status);
router.get('/log', getLog);
router.get('/branches', getBranches);
router.post('/checkout', checkout);

module.exports = router;
