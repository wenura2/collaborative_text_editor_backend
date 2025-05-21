const Project = require("../models/Project");
const ProjectModel = require("../models/projectModel");
const User = require("../models/userModel");
const { isValidObjectId } = require("mongoose");
const crypto = require("crypto");

const activeProjects = new Map();

const generateSecretCode = () => {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

const getOrCreateProject = async (projectId, userId = null) => {
  if (activeProjects.has(projectId)) {
    return activeProjects.get(projectId);
  }

  try {
    const projectData = await ProjectModel.findOne({ projectId });

    if (projectData) {
      const project = new Project(projectData);
      activeProjects.set(projectId, project);
      return project;
    } else if (userId) {
      const project = new Project();
      activeProjects.set(projectId, project);
      return project;
    }

    return null;
  } catch (error) {
    console.error("Error getting project:", error);
    return null;
  }
};

const getUserProjects = async (req, res) => {
  try {
    const userId = req.user._id;

    const projects = await ProjectModel.find({
      $or: [{ owner: userId }, { collaborators: userId }],
    })
      .select("projectId name description createdAt secretCode")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Error getting user projects:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const checkAccess = async (projectId, userId, secretCode) => {
  try {
    const projectData = await ProjectModel.findOne({ projectId });

    if (!projectData) {
      return false;
    }

    if (userId) {
      if (projectData.owner.toString() === userId.toString()) {
        return true;
      }
      const isCollaborator = projectData.collaborators.some(
        (collaboratorId) => collaboratorId.toString() === userId.toString()
      );
      if (isCollaborator) {
        return true;
      }
    }

    if (secretCode && projectData.secretCode === secretCode) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking access:", error);
    return false;
  }
};

const saveProjectChanges = async (projectId) => {
  if (!activeProjects.has(projectId)) {
    return false;
  }

  try {
    const project = activeProjects.get(projectId);
    const projectData = await ProjectModel.findOne({ projectId });

    if (!projectData) {
      return false;
    }

    const allFiles = [
      project.defaultFile,
      ...Array.from(project.files.values()),
    ];

    const uniqueFiles = allFiles.filter(
      (file, index, self) => index === self.findIndex((f) => f.id === file.id)
    );

    projectData.files = uniqueFiles;
    await projectData.save();
    return true;
  } catch (error) {
    console.error("Error saving project changes:", error);
    return false;
  }
};

module.exports = {
  handleJoin: async (socket, projectId, username, secretCode) => {
    try {
      let userId = null;
      if (
        socket.request &&
        socket.request.session &&
        socket.request.session.userId
      ) {
        userId = socket.request.session.userId;
      }

      const hasAccess = await checkAccess(projectId, userId, secretCode);
      if (!hasAccess) {
        socket.emit("error", { message: "Access denied" });
        return;
      }

      const project = await getOrCreateProject(projectId);
      if (!project) {
        socket.emit("error", { message: "Project not found" });
        return;
      }

      const files = Array.from(project.files.values());

      socket.emit("project_data", { files });

      socket.join(projectId);
      socket.projectId = projectId;

      console.log(`User ${username} joined project ${projectId}`);

      return true;
    } catch (error) {
      console.error("Error handling join:", error);
      socket.emit("error", { message: "Server error" });
      return false;
    }
  },

  handleCodeChange: async (socket, projectId, fileId, content) => {
    try {
      const project = await getOrCreateProject(projectId);
      if (!project) return false;

      project.updateFile(fileId, content);

      socket.to(projectId).emit("code_update", { fileId, content });

      setTimeout(() => saveProjectChanges(projectId), 2000);

      return true;
    } catch (error) {
      console.error("Error handling code change:", error);
      return false;
    }
  },

  handleFileCreate: async (socket, projectId, fileName) => {
    try {
      const project = await getOrCreateProject(projectId);
      if (!project) return null;

      const newFile = project.addFile(fileName);

      socket.to(projectId).emit("new_file", newFile);

      setTimeout(() => saveProjectChanges(projectId), 1000);

      return newFile;
    } catch (error) {
      console.error("Error creating file:", error);
      return null;
    }
  },

  createProject: async (req, res) => {
    try {
      const { name, description } = req.body;
      const userId = req.user._id;

      if (!name) {
        return res
          .status(400)
          .json({ success: false, message: "Project name is required" });
      }

      const projectId = Date.now().toString();
      const secretCode = generateSecretCode();

      const project = new Project();
      const projectData = project.toMongoFormat(
        projectId,
        userId,
        secretCode,
        name,
        description
      );

      const newProject = await ProjectModel.create(projectData);

      activeProjects.set(projectId.toString(), project);

      res.status(201).json({
        success: true,
        project: {
          id: newProject.projectId,
          name: newProject.name,
          secretCode: newProject.secretCode,
          createdAt: newProject.createdAt,
        },
      });
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  getUserProjects: async (req, res) => {
    try {
      const userId = req.user._id;

      const projects = await ProjectModel.find({
        $or: [{ owner: userId }, { collaborators: userId }],
      })
        .populate("owner", "email username")
        .populate("collaborators", "email username")
        .select(
          "projectId name description createdAt secretCode owner collaborators"
        )
        .sort({ createdAt: -1 });

      const formattedProjects = projects.map((project) => ({
        projectId: project.projectId,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        secretCode: project.secretCode,
        owner: {
          id: project.owner._id,
          email: project.owner.email,
          username: project.owner.username,
        },
        collaborators: project.collaborators.map((collaborator) => ({
          id: collaborator._id,
          email: collaborator.email,
          username: collaborator.username,
        })),
      }));

      res.status(200).json({
        success: true,
        projects: formattedProjects,
      });
    } catch (error) {
      console.error("Error getting user projects:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  addCollaborator: async (req, res) => {
    try {
      const { projectId } = req.params;
      const { email } = req.body;
      const userId = req.user._id;

      const project = await ProjectModel.findOne({ projectId });
      if (!project) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      if (project.owner.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Only the owner can add collaborators",
        });
      }

      const userToAdd = await User.findOne({ email });
      if (!userToAdd) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const isCollaborator = project.collaborators.some(
        (collab) => collab.toString() === userToAdd._id.toString()
      );
      if (isCollaborator) {
        return res
          .status(400)
          .json({ success: false, message: "User is already a collaborator" });
      }

      project.collaborators.push(userToAdd._id);
      await project.save();

      res
        .status(200)
        .json({ success: true, message: "Collaborator added successfully" });
    } catch (error) {
      console.error("Error adding collaborator:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  getProjectById: async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user?._id;
      const { secretCode } = req.query;

      const hasAccess = await checkAccess(projectId, userId, secretCode);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }

      const projectData = await ProjectModel.findOne({ projectId })
        .populate("owner", "email")
        .populate("collaborators", "email");

      if (!projectData) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      const projectDetails = {
        id: projectData.projectId,
        name: projectData.name,
        description: projectData.description,
        owner: projectData.owner.email,
        collaborators: projectData.collaborators.map((user) => user.email),
        isOwner: userId && projectData.owner.toString() === userId.toString(),
        gitConnected: projectData.gitConnected,
        fileCount: projectData.files.length,
        createdAt: projectData.createdAt,
        updatedAt: projectData.updatedAt,
      };

      res.status(200).json({
        success: true,
        project: projectDetails,
      });
    } catch (error) {
      console.error("Error getting project details:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  updateProject: async (req, res) => {
    try {
      const { projectId } = req.params;
      const { name, description } = req.body;
      const userId = req.user._id;

      const projectData = await ProjectModel.findOne({ projectId });

      if (!projectData) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      if (projectData.owner.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Only the owner can update the project",
        });
      }

      if (name) projectData.name = name;
      if (description !== undefined) projectData.description = description;

      await projectData.save();

      res.status(200).json({
        success: true,
        message: "Project updated successfully",
      });
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  deleteProject: async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user._id;

      const projectData = await ProjectModel.findOne({ projectId });

      if (!projectData) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      if (projectData.owner.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Only the owner can delete the project",
        });
      }

      await ProjectModel.deleteOne({ projectId });

      activeProjects.delete(projectId);

      res.status(200).json({
        success: true,
        message: "Project deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  getSecretCode: async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user._id;

      const projectData = await ProjectModel.findOne({ projectId });

      if (!projectData) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      if (projectData.owner.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Only the owner can view the secret code",
        });
      }

      res.status(200).json({
        success: true,
        secretCode: projectData.secretCode,
      });
    } catch (error) {
      console.error("Error getting secret code:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  regenerateSecretCode: async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user._id;

      const projectData = await ProjectModel.findOne({ projectId });

      if (!projectData) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      if (projectData.owner.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Only the owner can regenerate the secret code",
        });
      }

      const newSecretCode = generateSecretCode();
      projectData.secretCode = newSecretCode;
      await projectData.save();

      res.status(200).json({
        success: true,
        secretCode: newSecretCode,
      });
    } catch (error) {
      console.error("Error regenerating secret code:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  getProjectBySecretCode: async (req, res) => {
    try {
      const { secretCode } = req.params;

      const projectData = await ProjectModel.findBySecretCode(secretCode);

      if (!projectData) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      res.status(200).json({
        success: true,
        project: {
          id: projectData.projectId,
          name: projectData.name,
          description: projectData.description,
          owner: projectData.owner,
          secretCode: projectData.secretCode,
          fileCount: projectData.files.length,
          createdAt: projectData.createdAt,
        },
      });
    } catch (error) {
      console.error("Error fetching project by secret code:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
};
