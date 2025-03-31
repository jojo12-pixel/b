// Functions to enhance prompts for more complex projects

// Check if a prompt should be enhanced
export function shouldEnhancePrompt(message) {
    const projectKeywords = [
        'create', 'make', 'build', 'develop', 'generate', 'website', 'game', 
        'app', 'application', 'web app', 'project', 'portfolio', 'design'
    ];
    
    const messageLower = message.toLowerCase();
    return projectKeywords.some(keyword => messageLower.includes(keyword));
}

// Enhance prompts to generate more complex projects
export function enhancePrompt(message) {
    // Base enhancements to add to all project prompts
    const enhancements = [
        "Please make this project complex and feature-rich.",
        "Include responsive design for mobile and desktop.",
        "Add animations and interactive elements.",
        "Optimize for performance and user experience.",
        "Include comprehensive comments in the code."
    ];
    
    // Specific enhancements based on project type
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('website') || messageLower.includes('web')) {
        enhancements.push(
            "Include a navigation menu and multiple pages or sections.",
            "Add form validation and interactive features.",
            "Use modern CSS techniques like Grid and Flexbox."
        );
    }
    
    if (messageLower.includes('game')) {
        enhancements.push(
            "Include game levels or increasing difficulty.",
            "Add scoring system and game state management.",
            "Include sound effects or background music (via CDN).",
            "Create smooth animations and responsive controls."
        );
    }
    
    if (messageLower.includes('app') || messageLower.includes('application')) {
        enhancements.push(
            "Implement data persistence using localStorage.",
            "Add user settings or preferences.",
            "Include error handling and user feedback."
        );
    }
    
    // Check if assets are mentioned
    if (messageLower.includes('asset') || messageLower.includes('assets')) {
        enhancements.push(
            "Properly integrate all uploaded assets into the project.",
            "Use semantic naming for asset references.",
            "Add loading handlers for assets when appropriate."
        );
    }
    
    // Randomly select 2-3 enhancements to avoid making prompts too long
    const selectedEnhancements = enhancements
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
    
    return `${message} 
    
Additional requirements:
- ${selectedEnhancements.join('\n- ')}
    
Please make this project as comprehensive and production-ready as possible.`;
}

// Function to start a new chat
export function startNewChat() {
    // Clear chat messages except for the welcome message
    const messages = document.getElementById('messages');
    messages.innerHTML = '';
    
    // Add welcome message
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'message system';
    welcomeMessage.innerHTML = `
        <div class="message-content">
            <p>${config.welcomeMessage}</p>
        </div>
    `;
    messages.appendChild(welcomeMessage);
    
    // Clear file storage and preview
    window.state.files = {};
    window.state.imageHistory = [];
    
    // Update UI
    const previewFrame = document.getElementById('preview-frame');
    if (previewFrame) {
        previewFrame.srcdoc = '';
    }
    
    const fileList = document.getElementById('file-list');
    if (fileList) {
        fileList.innerHTML = '';
    }
    
    // Clear current project reference in project history
    if (window.updateProjectHistory) {
        window.updateProjectHistory(true); // true means create new project
    }
}