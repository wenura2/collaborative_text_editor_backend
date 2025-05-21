const GitService = require("../services/gitService");
const { isAuthenticated } = require("../middleware/auth");

const init = async (req, res) => {
  try {
    const { projectPath } = req.body;
    const gitService = new GitService(projectPath);
    await gitService.init();
    res.json({ success: true });
  } catch (error) {
    console.error('Error in init:', error);
    res.status(500).json({ error: error.message });
  }
};

const clone = async (req, res) => {
  try {
    const { repoUrl, projectPath } = req.body;
    const gitService = new GitService(projectPath);
    await gitService.clone(repoUrl);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const commit = async (req, res) => {
  try {
    const { projectPath, message, files } = req.body;
    const gitService = new GitService(projectPath);
    await gitService.add(files || ".");
    await gitService.commit(message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const push = async (req, res) => {
  try {
    const { projectPath, remote, branch } = req.body;
    const gitService = new GitService(projectPath);
    await gitService.push(remote || "origin", branch || "master");
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const pull = async (req, res) => {
  try {
    const { projectPath, remote, branch } = req.body;
    const gitService = new GitService(projectPath);
    await gitService.pull(remote || "origin", branch || "master");
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const status = async (req, res) => {
  try {
    const { projectPath } = req.query;
    const gitService = new GitService(projectPath);
    const status = await gitService.status();
    console.log(status)
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getLog = async (req, res) => {
  try {
    const { projectPath } = req.query;
    const gitService = new GitService(projectPath);
    const logs = await gitService.getLog();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBranches = async (req, res) => {
  try {
    const { projectPath } = req.query;
    const gitService = new GitService(projectPath);
    const branches = await gitService.getBranches();
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const checkout = async (req, res) => {
  try {
    const { projectPath, branch } = req.body;
    const gitService = new GitService(projectPath);
    await gitService.checkout(branch);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
};
