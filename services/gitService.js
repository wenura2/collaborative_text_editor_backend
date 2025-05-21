const path = require('path');
const fs = require('fs');
const git = require('simple-git');

class GitService {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.git = git({ baseDir: this.projectPath });
  }

  async init() {
    return this.git.init();
  }

  async clone(repoUrl, options = {}) {
    return this.git.clone(repoUrl, this.projectPath, options);
  }

  async addRemote(name, url) {
    return this.git.addRemote(name, url);
  }

  async add(files = '.') {
    return this.git.add(files);
  }

  async commit(message) {
    return this.git.commit(message);
  }

  async push(remote = 'origin', branch = 'master') {
    return this.git.push(remote, branch);
  }

  async pull(remote = 'origin', branch = 'master') {
    return this.git.pull(remote, branch);
  }

  async status() {
    return this.git.status();
  }

  async getBranches() {
    return this.git.branch();
  }

  async checkout(branch) {
    return this.git.checkout(branch);
  }

  async getLog() {
    return this.git.log();
  }

  
  
}

module.exports = GitService;