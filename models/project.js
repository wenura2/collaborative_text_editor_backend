class Project {
  constructor(projectData = null) {
    this.files = new Map();

    if (projectData) {
      this.projectId = projectData.projectId;

      const files = projectData.files || [];

      for (const file of files) {
        const fileId = file._id?.toString() || file.id?.toString() || Date.now().toString() + Math.random().toString().slice(2, 8);
        
        this.files.set(fileId, {
          id: fileId,
          name: file.name,
          path: file.path || `/${file.name}`,
          content: file.content || ''
        });
      }

      if (files.length > 0) {
        const firstFile = files[0];
        const firstFileId = firstFile._id?.toString() || firstFile.id?.toString() || '1';
        
        this.defaultFile = {
          id: firstFileId,
          name: firstFile.name,
          path: firstFile.path || `/${firstFile.name}`,
          content: firstFile.content || ''
        };
        
        if (!this.files.has(firstFileId)) {
          this.files.set(firstFileId, this.defaultFile);
        }
      } else {
        this.defaultFile = {
          id: '1',
          name: 'main.js',
          path: '/main.js',
          content: '// Default file content'
        };
        this.files.set('1', this.defaultFile);
      }
    } else {
      this.defaultFile = {
        id: '1',
        name: 'main.js',
        path: '/main.js',
        content: '// Default file content'
      };
      this.files.set('1', this.defaultFile);
    }
  }

  getFile(fileId) {
    return this.files.get(fileId) || this.defaultFile;
  }

  addFile(fileName) {
    const fileId = Date.now().toString();
    const file = {
      id: fileId,
      name: fileName,
      path: `/${fileName}`,
      content: '// New file'
    };
    this.files.set(fileId, file);
    return file;
  }

  updateFile(fileId, content) {
    if (this.defaultFile.id === fileId) {
      this.defaultFile.content = content;
      return;
    }
    
    const file = this.files.get(fileId);
    if (file) {
      file.content = content;
    }
  }

  toMongoFormat(projectId, ownerId, secretCode, name, description = '') {
    const allFiles = [this.defaultFile, ...Array.from(this.files.values())];

    const uniqueFiles = allFiles.filter((file, index, self) =>
      index === self.findIndex(f => f.id === file.id)
    );

    return {
      projectId,
      owner: ownerId,
      secretCode,
      name,
      description,
      files: uniqueFiles.map(file => ({
        id: file.id,
        name: file.name,
        path: file.path || `/${file.name}`,
        content: file.content
      })),
      gitConnected: false,
      gitRepo: {}
    };
  }

  static async getBySecretCode(secretCode) {
    const ProjectModel = require('./projectModel');
    const projectData = await ProjectModel.findBySecretCode(secretCode);
    if (!projectData) return null;
    return new Project(projectData);
  }
}

module.exports = Project;