const GitService = require("../services/gitService");
const { validateProjectName } = require("../services/gitService");
const path = require("path");
const fs = require("fs");
const { isAuthenticated } = require("../middleware/auth");

/**
 * Get or create the projects directory
 */
function getProjectsDir() {
  const projectsDir = path.join(__dirname, "../projects");
  
  // Ensure projects directory exists
  if (!fs.existsSync(projectsDir)) {
    console.log(`[GitController] Creating projects directory: ${projectsDir}`);
    fs.mkdirSync(projectsDir, { recursive: true });
  }
  
  return projectsDir;
}

/**
 * Get full project path from project name
 */
function getProjectPath(projectName) {
  // Validate project name before using it
  const validatedName = validateProjectName(projectName);
  const projectsDir = getProjectsDir();
  return path.join(projectsDir, validatedName);
}

/**
 * Initialize a git repository in a project directory
 */
const init = async (req, res) => {
  try {
    const { projectName } = req.body;
    
    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    console.log(`[Git Init] Project: ${projectName}`);
    
    const projectPath = getProjectPath(projectName);
    const gitService = new GitService(projectPath);
    
    await gitService.init();
    
    console.log(`[Git Init] Repository initialized at: ${projectPath}`);
    res.json({ success: true, path: projectPath });
  } catch (error) {
    console.error(`[Git Init] Error: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Clone a repository into a new project directory
 */
const clone = async (req, res) => {
  try {
    const { projectName, repoUrl } = req.body;
    
    // Validate inputs
    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }
    
    console.log(`[Git Clone] Starting clone`);
    console.log(`[Git Clone] Project: ${projectName}`);
    console.log(`[Git Clone] Repo: ${repoUrl}`);
    
    const projectPath = getProjectPath(projectName);
    
    // Check if project already exists
    if (fs.existsSync(projectPath)) {
      const files = fs.readdirSync(projectPath);
      if (files.length > 0) {
        return res.status(400).json({ 
          error: `Project "${projectName}" already exists` 
        });
      }
    }
    
    console.log(`[Git Clone] Cloning into: ${projectPath}`);
    
    const gitService = new GitService(projectPath);
    await gitService.clone(repoUrl);
    
    // Get status of the cloned repository
    const status = await gitService.status();
    
    console.log(`[Git Clone] Clone completed successfully`);
    res.json({ 
      success: true, 
      path: projectPath,
      projectName,
      status 
    });
  } catch (error) {
    console.error(`[Git Clone] Error: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Commit changes in a project
 */
const commit = async (req, res) => {
  try {
    const { projectName, message, files } = req.body;
    
    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Commit message is required' });
    }
    
    console.log(`[Git Commit] Project: ${projectName}`);
    
    const projectPath = getProjectPath(projectName);
    const gitService = new GitService(projectPath);
    
    await gitService.add(files || ".");
    await gitService.commit(message);
    
    const status = await gitService.status();
    
    res.json({ success: true, status });
  } catch (error) {
    console.error(`[Git Commit] Error: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Push changes to remote
 */
const push = async (req, res) => {
  try {
    const { projectName, remote, branch } = req.body;
    
    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    console.log(`[Git Push] Project: ${projectName}`);
    
    const projectPath = getProjectPath(projectName);
    const gitService = new GitService(projectPath);
    
    await gitService.push(remote || "origin", branch || "main");
    
    const status = await gitService.status();
    
    res.json({ success: true, status });
  } catch (error) {
    console.error(`[Git Push] Error: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Pull changes from remote
 */
const pull = async (req, res) => {
  try {
    const { projectName, remote, branch } = req.body;
    
    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    console.log(`[Git Pull] Project: ${projectName}`);
    
    const projectPath = getProjectPath(projectName);
    const gitService = new GitService(projectPath);
    
    await gitService.pull(remote || "origin", branch || "main");
    
    const status = await gitService.status();
    
    res.json({ success: true, status });
  } catch (error) {
    console.error(`[Git Pull] Error: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get repository status
 */
const status = async (req, res) => {
  try {
    const { projectName } = req.query;
    
    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const projectPath = getProjectPath(projectName);
    
    // Check if project exists
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ 
        error: `Project "${projectName}" not found` 
      });
    }
    
    const gitService = new GitService(projectPath);
    const repoStatus = await gitService.status();
    
    console.log(`[Git Status] Project: ${projectName}`);
    res.json(repoStatus);
  } catch (error) {
    console.error(`[Git Status] Error: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get repository log
 */
const getLog = async (req, res) => {
  try {
    const { projectName } = req.query;
    
    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const projectPath = getProjectPath(projectName);
    const gitService = new GitService(projectPath);
    
    const logs = await gitService.getLog();
    res.json(logs);
  } catch (error) {
    console.error(`[Git Log] Error: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get repository branches
 */
const getBranches = async (req, res) => {
  try {
    const { projectName } = req.query;
    
    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const projectPath = getProjectPath(projectName);
    const gitService = new GitService(projectPath);
    
    const branches = await gitService.getBranches();
    res.json(branches);
  } catch (error) {
    console.error(`[Git Branches] Error: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Checkout a branch
 */
const checkout = async (req, res) => {
  try {
    const { projectName, branch } = req.body;
    
    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    if (!branch) {
      return res.status(400).json({ error: 'Branch name is required' });
    }
    
    const projectPath = getProjectPath(projectName);
    const gitService = new GitService(projectPath);
    
    await gitService.checkout(branch);
    
    res.json({ success: true });
  } catch (error) {
    console.error(`[Git Checkout] Error: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  init,
  clone,
  commit,
  push,
  pull,
  status,
  getLog,
  getBranches,
  checkout,
  getProjectsDir,
  getProjectPath,
};
