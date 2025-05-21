const { Octokit } = require('octokit');

class GitHubService {
  constructor(accessToken) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  async createRepo(name, isPrivate = false) {
    return this.octokit.rest.repos.createForAuthenticatedUser({
      name,
      private: isPrivate
    });
  }

  async getUserRepos() {
    return this.octokit.rest.repos.listForAuthenticatedUser();
  }

}

module.exports = GitHubService;