const axios = require("axios");
const GitHubService = require('../services/githubService');

const exchangeGitHubCodeForToken = async (req, res) => {
  const { code } = req.body;

  try {
    // Validate required environment variables
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      return res.status(500).json({ 
        error: "GitHub OAuth not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET." 
      });
    }

    const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 
      (process.env.FRONTEND_URL || "http://localhost:5173") + "/github-auth";

    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: GITHUB_REDIRECT_URI,
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
