const express = require('express');
const router = express.Router();
const { exchangeGitHubCodeForToken, createRepo, getUserRepos } = require('../controllers/githubController');

router.post('/oauth', exchangeGitHubCodeForToken);
router.post('/create-repo', createRepo);
router.get('/repos', getUserRepos);

module.exports = router;
