// services/gitProjectService.js
const GitService = require('./gitService');
const GitHubService = require('./githubService');
const ProjectModel = require('../models/projectModel');
const fs = require('fs');
const path = require('path');
const os = require('os');

class GitProjectService {
  constructor(projectId, userId) {
    this.projectId = projectId;
    this.userId = userId;
    this.projectPath = path.join(os.tmpdir(), 'codedit', projectId);
    this.repoPath = path.join(os.tmpdir(), projectId);
    this.gitService = new GitService(this.projectPath);
  }
  
  async initialize() {
    try {
      const project = await ProjectModel.findOne({ 
        projectId: this.projectId, 
        owner: this.userId 
      });
      
      if (!project) {
        throw new Error('Project not found or user is not the owner');
      }
      
      if (!fs.existsSync(this.projectPath)) {
        fs.mkdirSync(this.projectPath, { recursive: true });
      }
      
      for (const file of project.files) {
        const filePath = path.join(this.projectPath, file.name);
        fs.writeFileSync(filePath, file.content || '');
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error initializing git project service:", error);
      return { success: false, error: error.message };
    }
  }
  
  async initGit() {
    try {
      await this.initialize();
      await this.gitService.init();
      
      await ProjectModel.updateOne(
        { projectId: this.projectId },
        { gitConnected: true }
      );
      
      return { success: true };
    } catch (error) {
      console.error("Error initializing git:", error);
      return { success: false, error: error.message };
    }
  }
  
  async connectToGitHub(repoUrl, accessToken) {
    try {
      await this.initialize();
      
      await ProjectModel.updateOne(
        { projectId: this.projectId },
        { 
          gitConnected: true,
          'gitRepo.repoUrl': repoUrl
        }
      );
      
      await this.gitService.clone(repoUrl);
      
      const project = await ProjectModel.findOne({ projectId: this.projectId });
      for (const file of project.files) {
        const filePath = path.join(this.projectPath, file.name);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, file.content || '');
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error connecting to GitHub:", error);
      return { success: false, error: error.message };
    }
  }
  
  async createGitHubRepo(repoName, isPrivate, accessToken) {
    try {
      const githubService = new GitHubService(accessToken);
      const response = await githubService.createRepo(repoName, isPrivate);
      
      if (response && response.data && response.data.clone_url) {
        await ProjectModel.updateOne(
          { projectId: this.projectId },
          { 
            gitConnected: true,
            'gitRepo.repoUrl': response.data.clone_url
          }
        );
        
        await this.initialize();
        await this.gitService.init();
        await this.gitService.addRemote('origin', response.data.clone_url);
        
        return { 
          success: true, 
          repoUrl: response.data.clone_url,
          repoData: response.data
        };
      } else {
        throw new Error('Failed to create GitHub repository');
      }
    } catch (error) {
      console.error("Error creating GitHub repository:", error);
      return { success: false, error: error.message };
    }
  }
  
  async commit(message) {
    try {
      await this.initialize();
      
      const project = await ProjectModel.findOne({ projectId: this.projectId });
      for (const file of project.files) {
        const filePath = path.join(this.projectPath, file.name);
        fs.writeFileSync(filePath, file.content || '');
      }
      
      await this.gitService.add('.');
      await this.gitService.commit(message);
      
      await ProjectModel.updateOne(
        { projectId: this.projectId },
        { 'gitRepo.lastCommit': message }
      );
      
      return { success: true };
    } catch (error) {
      console.error("Error committing changes:", error);
      return { success: false, error: error.message };
    }
  }
  
  async push(branch = 'main') {
    try {
      await this.initialize();
      await this.gitService.push('origin', branch);
      
      return { success: true };
    } catch (error) {
      console.error("Error pushing changes:", error);
      return { success: false, error: error.message };
    }
  }

  async pull(branch = 'main') {
    try {
      await this.initialize();
      await this.gitService.pull('origin', branch);
      
      const files = fs.readdirSync(this.projectPath)
        .filter(file => !file.startsWith('.') && !fs.statSync(path.join(this.projectPath, file)).isDirectory())
        .map(file => {
          const filePath = path.join(this.projectPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          return {
            id: Date.now() + '-' + file,
            name: file,
            content
          };
        });
      
      await ProjectModel.updateOne(
        { projectId: this.projectId },
        { files }
      );
      
      return { success: true, files };
    } catch (error) {
      console.error("Error pulling changes:", error);
      return { success: false, error: error.message };
    }
  }
  
  async getStatus() {
    try {
      await this.initialize();
      const status = await this.gitService.status();
      
      return { success: true, status };
    } catch (error) {
      console.error("Error getting status:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = GitProjectService;