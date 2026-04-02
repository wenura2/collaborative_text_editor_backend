let octokitClassPromise;

const getOctokitClass = async () => {
  if (!octokitClassPromise) {
    octokitClassPromise = import("@octokit/rest").then(({ Octokit }) => Octokit);
  }
  return octokitClassPromise;
};

class GitHubService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.octokitPromise = null;
  }

  async getClient() {
    if (!this.octokitPromise) {
      this.octokitPromise = getOctokitClass().then(
        (Octokit) => new Octokit({ auth: this.accessToken })
      );
    }
    return this.octokitPromise;
  }

  async createRepo(name, isPrivate = false) {
    const octokit = await this.getClient();
    return octokit.rest.repos.createForAuthenticatedUser({
      name,
      private: isPrivate
    });
  }

  async getUserRepos() {
    const octokit = await this.getClient();
    return octokit.rest.repos.listForAuthenticatedUser();
  }

}

module.exports = GitHubService;