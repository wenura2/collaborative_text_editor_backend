const express = require('express');
const router = express.Router();
const { createProject, getUserProjects, addCollaborator, getProjectById, updateProject, deleteProject, getSecretCode, getProjectBySecretCode } = require('../controllers/projectController');
const { isAuthenticated } = require('../middleware/auth'); 

router.post('/', isAuthenticated, createProject);
router.get('/', isAuthenticated, getUserProjects);
router.get('/:projectId', isAuthenticated, getProjectById);
router.put('/:projectId', isAuthenticated, updateProject);
router.delete('/:projectId', isAuthenticated, deleteProject);
router.get('/:projectId/secret-code', isAuthenticated, getSecretCode);
router.get('/secret/:secretCode', isAuthenticated, getProjectBySecretCode);
router.post('/:projectId/collaborators', isAuthenticated, addCollaborator);

module.exports = router;
