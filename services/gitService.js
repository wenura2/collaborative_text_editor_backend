const path = require('path');
const fs = require('fs');
const git = require('simple-git');

/**
 * Validate project name to prevent path traversal and invalid characters
 */
function validateProjectName(projectName) {
  if (!projectName || typeof projectName !== 'string') {
    throw new Error('Project name must be a non-empty string');
  }
  
  const trimmed = projectName.trim();
  if (!trimmed) {
    throw new Error('Project name cannot be empty or whitespace only');
  }
  
  // Prevent path traversal and invalid characters
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Project name cannot contain path separators or ".."');
  }
  
  // Prevent special characters that could cause issues
  if (!/^[a-zA-Z0-9\s\-_.]+$/.test(trimmed)) {
    throw new Error('Project name can only contain alphanumeric characters, spaces, hyphens, underscores, and periods');
  }
  
  return trimmed;
}

class GitService {
  constructor(projectPath) {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Project path must be a valid string');
    }
    this.projectPath = projectPath;
    this.git = null; // Initialize git instance lazily
  }

  /**
   * Get or initialize the git instance
   */
  getGit() {
    if (!this.git) {
      // Ensure directory exists before creating git instance
      if (!fs.existsSync(this.projectPath)) {
        fs.mkdirSync(this.projectPath, { recursive: true });
      }
      this.git = git({ baseDir: this.projectPath });
    }
    return this.git;
  }

  /**
   * Initialize a new git repository
   */
  async init() {
    console.log(`[GitService] Initializing repo at: ${this.projectPath}`);
    
    // Use getGit which ensures directory exists
    const git = this.getGit();
    return git.init();
  }

  /**
   * Clone a repository with proper directory handling
   */
  async clone(repoUrl) {
    console.log(`[GitService] Cloning into: ${this.projectPath}`);
    console.log(`[GitService] From: ${repoUrl}`);
    
    if (!repoUrl || typeof repoUrl !== 'string') {
      throw new Error('Repository URL must be provided');
    }
    
    // Get parent directory
    const parentDir = path.dirname(this.projectPath);
    const projectName = path.basename(this.projectPath);
    
    // Ensure parent directory exists
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    
    // Check if target directory already exists
    if (fs.existsSync(this.projectPath)) {
      console.log(`[GitService] Project directory already exists: ${this.projectPath}`);
      const files = fs.readdirSync(this.projectPath);
      if (files.length > 0) {
        throw new Error(`Project directory already exists and is not empty: ${projectName}`);
      }
      // Remove empty directory
      fs.rmSync(this.projectPath, { recursive: true, force: true });
    }
    
    console.log(`[GitService] Cloning repo: ${repoUrl}`);
    try {
      // Use simple-git to clone directly into the target path
      // This ensures the directory is created properly during clone
      const simpleGit = git();
      await simpleGit.clone(repoUrl, this.projectPath);
      
      // Reset git instance so it gets reinitialized on next use
      this.git = null;
      
      console.log(`[GitService] Clone completed successfully`);
      return { success: true, path: this.projectPath };
    } catch (error) {
      console.error(`[GitService] Clone error: ${error.message}`);
      throw error;
    }
  }

  async addRemote(name, url) {
    return this.getGit().addRemote(name, url);
  }

  async add(files = '.') {
    return this.getGit().add(files);
  }

  async commit(message) {
    return this.getGit().commit(message);
  }

  async push(remote = 'origin', branch = 'master') {
    return this.getGit().push(remote, branch);
  }

  async pull(remote = 'origin', branch = 'master') {
    return this.getGit().pull(remote, branch);
  }

  async status() {
    return this.getGit().status();
  }

  async getBranches() {
    return this.getGit().branch();
  }

  async checkout(branch) {
    return this.getGit().checkout(branch);
  }

  async getLog() {
    return this.getGit().log();
  }
}

module.exports = GitService;
module.exports.validateProjectName = validateProjectName;