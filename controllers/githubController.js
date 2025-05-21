const axios = require("axios");
const GitHubService = require('../services/githubService');

const exchangeGitHubCodeForToken = async (req, res) => {
  const { code } = req.body;

  try {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: "Ov23liTae4WNJqAamzvi",
        client_secret: "2ab88bbc6d8bbb9ad13464edc3e5864db7c46dd4",
        code: code,
        redirect_uri: "http://localhost:5173/github-auth",
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken = response.data.access_token;
    if (!accessToken) {
      return res.status(400).json({ error: "Failed to get access token" });
    }

    res.json({ accessToken });
  } catch (err) {
    console.error(
      "GitHub OAuth exchange error:",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "OAuth exchange failed" });
  }
};

const createRepo = async (req, res) => {
  try {
    const { name, isPrivate, accessToken } = req.body;
    const githubService = new GitHubService(accessToken);
    const repo = await githubService.createRepo(name, isPrivate);
    res.json(repo.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserRepos = async (req, res) => {
  try {
    const { accessToken } = req.query;
    const githubService = new GitHubService(accessToken);
    const repos = await githubService.getUserRepos();
    res.json(repos.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
module.exports = { exchangeGitHubCodeForToken, createRepo, getUserRepos };
