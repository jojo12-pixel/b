// Functions for managing project history and persistence
import { config } from './config.js';

// Structure for storing projects
const projectHistory = {
  projects: [],
  currentProjectId: null
};

// Load project history from localStorage
export function loadProjectHistory() {
  try {
    const savedProjects = localStorage.getItem(config.ui.STORAGE_KEY);
    if (savedProjects) {
      const parsed = JSON.parse(savedProjects);
      projectHistory.projects = parsed.projects || [];
      projectHistory.currentProjectId = parsed.currentProjectId || null;
    }
  } catch (error) {
    console.error('Error loading project history:', error);
    // Initialize with empty state if error
    projectHistory.projects = [];
    projectHistory.currentProjectId = null;
  }
  return projectHistory;
}

// Save project history to localStorage
export function saveProjectHistory() {
  try {
    localStorage.setItem(config.ui.STORAGE_KEY, JSON.stringify(projectHistory));
  } catch (error) {
    console.error('Error saving project history:', error);
  }
}

// Create a new project
export function createProject(name) {
  const project = {
    id: generateProjectId(),
    name: name || `Project ${projectHistory.projects.length + 1}`,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    files: {},
    assets: [],
    chatHistory: []
  };
  
  projectHistory.projects.push(project);
  projectHistory.currentProjectId = project.id;
  saveProjectHistory();
  
  return project;
}

// Update an existing project
export function updateCurrentProject(state) {
  if (!projectHistory.currentProjectId) {
    // If no current project exists, create one
    const newProject = createProject(state.currentProjectName || 'Untitled Project');
    projectHistory.currentProjectId = newProject.id;
  }
  
  const project = getProjectById(projectHistory.currentProjectId);
  if (!project) return null;
  
  project.updated = new Date().toISOString();
  project.files = state.files || {};
  
  // Handle assets if present
  if (state.assets && Array.isArray(state.assets)) {
    project.assets = [...state.assets];
  }
  
  // Get chat history from DOM
  project.chatHistory = extractChatHistoryFromDOM();
  
  // Save changes immediately
  saveProjectHistory();
  return project;
}

// Extract chat history from DOM for saving
function extractChatHistoryFromDOM() {
  const history = [];
  const messageElements = document.querySelectorAll('#messages .message');
  
  messageElements.forEach(msg => {
    const type = msg.classList.contains('user') ? 'user' : 
                 msg.classList.contains('ai') ? 'ai' : 'system';
    const content = msg.querySelector('.message-content').innerHTML;
    
    history.push({
      type,
      content,
      timestamp: new Date().toISOString()
    });
  });
  
  return history;
}

// Get project by ID
export function getProjectById(id) {
  return projectHistory.projects.find(p => p.id === id);
}

// Delete project by ID
export function deleteProject(id) {
  const index = projectHistory.projects.findIndex(p => p.id === id);
  if (index !== -1) {
    projectHistory.projects.splice(index, 1);
    
    // Reset current project if we deleted the current one
    if (projectHistory.currentProjectId === id) {
      projectHistory.currentProjectId = null;
    }
    
    saveProjectHistory();
    return true;
  }
  return false;
}

// Load a project into the current state
export function loadProject(id, stateObj) {
  const project = getProjectById(id);
  if (!project) return false;
  
  // Update current project ID
  projectHistory.currentProjectId = id;
  
  // Copy project data to state
  stateObj.files = { ...project.files };
  stateObj.assets = [...project.assets];
  
  // Restore chat history
  restoreChatHistoryToDOM(project.chatHistory);
  
  saveProjectHistory();
  return true;
}

// Restore chat history to DOM
function restoreChatHistoryToDOM(chatHistory) {
  const messagesContainer = document.getElementById('messages');
  messagesContainer.innerHTML = '';
  
  chatHistory.forEach(msg => {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${msg.type}`;
    
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.innerHTML = msg.content;
    
    messageEl.appendChild(contentEl);
    messagesContainer.appendChild(messageEl);
  });
}

// Generate a unique project ID
function generateProjectId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Get all projects
export function getAllProjects() {
  return [...projectHistory.projects];
}

// Get current project
export function getCurrentProject() {
  if (!projectHistory.currentProjectId) return null;
  return getProjectById(projectHistory.currentProjectId);
}

// Debug function to check project history state
export function debugProjectHistory() {
  console.log('Current project history:', JSON.parse(JSON.stringify(projectHistory)));
  return projectHistory;
}