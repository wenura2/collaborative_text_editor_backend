const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  path: { type: String, required: true },
  name: { type: String, required: true },
  content: { type: String, default: '' },
  isDirectory: { type: Boolean, default: false }
});

const projectSchema = new mongoose.Schema({
  projectId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  secretCode: { type: String, required: true, unique: true },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  files: [fileSchema],
  gitIntegration: {
    isConnected: { type: Boolean, default: false },
    repoUrl: String,
    branch: { type: String, default: 'main' },
    lastCommit: String,
    accessToken: String
  },
  createdAt: { type: Date, default: Date.now }
});

projectSchema.statics.findBySecretCode = function(secretCode) {
  return this.findOne({ secretCode });
};

projectSchema.methods.findFileByPath = function(path) {
  return this.files.find(file => file.path === path);
};

projectSchema.methods.updateFileContent = function(path, content) {
  const file = this.findFileByPath(path);
  if (file) file.content = content;
};

module.exports = mongoose.model('Project', projectSchema);