// Importing functions from modules
import { config } from './config.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { marked } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import { shouldEnhancePrompt, enhancePrompt } from './prompt-enhancer.js';
import { processImage, createImagePreview, createImagePromptText } from './image-handler.js';
import { createPreviewHeader } from './preview-header.js';
import { processAsset, createAssetPreview, createAssetPromptText, getAllAssets, clearAssets } from './asset-manager.js';
import { 
    loadProjectHistory, 
    createProject, 
    updateCurrentProject, 
    loadProject, 
    deleteProject, 
    getAllProjects, 
    getCurrentProject 
} from './project-history.js';

// Initialize app state
const state = {
    files: {},
    currentView: 'chat',
    currentTheme: config.ui.DEFAULT_THEME,
    isGenerating: false,
    imageHistory: [],
    assets: [],
    currentModel: config.api.MODEL_NAME,
    currentProjectName: 'Untitled Project'
};

// Make state available globally for other modules
window.state = state;

// Configuration for features
const chatFeatures = {
    hideCodeBlocks: true,
    newTabPreview: true,
    autoEnhancePrompts: true
};

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(config.api.KEY);

// Function to create the appropriate model instance based on selection
function getSelectedModel() {
    const selectedModelId = state.currentModel;
    const modelInfo = config.api.AVAILABLE_MODELS.find(model => model.id === selectedModelId);
    
    if (!modelInfo) {
        console.error('Model not found:', selectedModelId);
        return genAI.getGenerativeModel({
            model: config.api.MODEL_NAME,
            systemInstruction: getSystemInstruction()
        });
    }
    
    if (modelInfo.provider === 'google') {
        return genAI.getGenerativeModel({
            model: selectedModelId,
            systemInstruction: getSystemInstruction()
        });
    }
    
    // For non-Google models, we'll handle them differently during generation
    return null;
}

// Get system instruction for the model
function getSystemInstruction() {
    return `You are an advanced AI model designed to collaboratively generate interactive web content based on user prompts.
    Focus on generating incredible HTML, CSS, and JavaScript content, leveraging SVG graphics, CSS animations, and JS to create fun, simple, and engaging interactive experiences.
    When asked to create a web project, respond with a complete solution including necessary HTML, CSS, and JavaScript files.
    Format your code response using markdown code blocks with language specifiers, like:
    
    \`\`\`html
    <html>...</html>
    \`\`\`
    
    \`\`\`css
    body { color: #333; }
    \`\`\`
    
    \`\`\`javascript
    function example() { console.log('Hello world'); }
    \`\`\`
    
    For ease of use, ensure each file is clearly labeled and separated.
    
    When a user uploads an image, analyze and reference the visual elements from it in your creation when appropriate.`;
}

// Configure marked for syntax highlighting
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true
});

// DOM elements
const elements = {
    messages: document.getElementById('messages'),
    userInput: document.getElementById('user-input'),
    sendButton: document.getElementById('send-button'),
    menuItems: document.querySelectorAll('.menu-item'),
    viewContainers: document.querySelectorAll('.view-container'),
    themeToggle: document.getElementById('theme-toggle'),
    previewFrame: document.getElementById('preview-frame'),
    refreshPreview: document.getElementById('refresh-preview'),
    fileList: document.getElementById('file-list'),
    downloadAll: document.getElementById('download-all'),
    imageUpload: document.getElementById('image-upload'),
    newChatButton: document.getElementById('new-chat-button'),
    imagePasteArea: document.getElementById('user-input'),
    assetUploadInput: document.getElementById('asset-upload'),
    modelSelect: document.getElementById('model-select'),
    projectNameInput: document.getElementById('project-name'),
    projectsList: document.getElementById('projects-list'),
    saveProjectButton: document.getElementById('save-project'),
    newProjectButton: document.getElementById('new-project')
};

// Event listeners
function setupEventListeners() {
    // Send message on button click or Enter key
    elements.sendButton.addEventListener('click', sendMessage);
    elements.userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
        
        // Auto-resize textarea
        setTimeout(() => {
            elements.userInput.style.height = 'auto';
            elements.userInput.style.height = `${Math.min(elements.userInput.scrollHeight, 150)}px`;
        }, 0);
    });
    
    // Navigation menu
    elements.menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.getAttribute('data-view');
            changeView(view);
        });
    });
    
    // Theme toggle
    elements.themeToggle.addEventListener('change', toggleTheme);
    
    // Refresh preview
    elements.refreshPreview.addEventListener('click', renderPreview);
    
    // Download all files
    elements.downloadAll.addEventListener('click', downloadAllFiles);
    
    // Image upload
    elements.imageUpload.addEventListener('change', handleImageUpload);
    
    // New chat button
    elements.newChatButton.addEventListener('click', () => {
        clearChatAndAssets();
    });
    
    // Image paste from clipboard
    elements.imagePasteArea.addEventListener('paste', handleImagePaste);
    
    // Asset upload
    elements.assetUploadInput.addEventListener('change', handleAssetUpload);
    
    // Setup the preview header with new tab button
    createPreviewHeader();
    
    // Model selection
    populateModelSelector();
    elements.modelSelect.addEventListener('change', changeModel);
    
    // Project management
    if (elements.saveProjectButton) {
        elements.saveProjectButton.addEventListener('click', saveCurrentProject);
    }
    if (elements.newProjectButton) {
        elements.newProjectButton.addEventListener('click', createNewProject);
    }
    if (elements.projectNameInput) {
        elements.projectNameInput.addEventListener('change', updateProjectName);
    }
    
    // Load project history
    loadProjectHistory();
    renderProjectsList();
    
    // Set up current project name if exists
    const currentProject = getCurrentProject();
    if (currentProject) {
        state.currentProjectName = currentProject.name;
        elements.projectNameInput.value = currentProject.name;
    }
    
    // Make the updateProjectHistory function available globally
    window.updateProjectHistory = updateProjectHistory;
    
    // Download as single HTML file
    const downloadSingleButton = document.getElementById('download-single');
    if (downloadSingleButton) {
        downloadSingleButton.addEventListener('click', createAndDownloadSingleFile);
    }
}

// Populate model selector dropdown
function populateModelSelector() {
    config.api.AVAILABLE_MODELS.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        option.selected = model.id === state.currentModel;
        elements.modelSelect.appendChild(option);
    });
}

// Change the current model
function changeModel() {
    state.currentModel = elements.modelSelect.value;
    console.log(`Model changed to: ${state.currentModel}`);
}

// Change the current view (chat, preview, export)
function changeView(view) {
    state.currentView = view;
    
    // Update menu items
    elements.menuItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === view);
    });
    
    // Update view containers
    elements.viewContainers.forEach(container => {
        container.classList.toggle('active', container.id === `${view}-view`);
    });
    
    // Special handling for views
    if (view === 'preview') {
        renderPreview();
    } else if (view === 'export') {
        renderFileList();
    }
}

// Toggle between light and dark themes
function toggleTheme() {
    state.currentTheme = elements.themeToggle.checked ? 'dark' : 'light';
    document.body.classList.toggle('light-theme', state.currentTheme === 'light');
}

// Handle user message sending
async function sendMessage() {
    const userMessage = elements.userInput.value.trim();
    if ((userMessage === '' && state.imageHistory.length === 0 && state.assets.length === 0) || state.isGenerating) return;
    
    // Clear input and reset height
    elements.userInput.value = '';
    elements.userInput.style.height = 'auto';
    
    // Combine text and image references
    let messageContent = userMessage;
    if (state.imageHistory.length > 0) {
        const latestImage = state.imageHistory[state.imageHistory.length - 1];
        if (!messageContent) {
            messageContent = "Please analyze this image and create something based on it.";
        }
    }
    
    // Add user message to chat
    const userMessageElement = addMessageToChat('user', messageContent);
    
    // Add image previews to the message if there are images
    if (state.imageHistory.length > 0) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'message-images';
        
        // Add only the most recent image to the message
        const latestImage = state.imageHistory[state.imageHistory.length - 1];
        const imagePreview = createImagePreview(latestImage);
        imageContainer.appendChild(imagePreview);
        
        userMessageElement.querySelector('.message-content').appendChild(imageContainer);
    }
    
    // Add asset previews to the message if there are assets
    if (state.assets.length > 0) {
        const assetContainer = document.createElement('div');
        assetContainer.className = 'message-images';
        
        // Add only up to 3 assets to avoid clutter
        const displayAssets = state.assets.slice(-3);
        displayAssets.forEach(asset => {
            const assetPreview = createAssetPreview(asset);
            assetContainer.appendChild(assetPreview);
        });
        
        if (state.assets.length > 3) {
            const moreInfo = document.createElement('div');
            moreInfo.className = 'asset-more-info';
            moreInfo.textContent = `+${state.assets.length - 3} more assets`;
            assetContainer.appendChild(moreInfo);
        }
        
        userMessageElement.querySelector('.message-content').appendChild(assetContainer);
    }
    
    // Show typing indicator
    const aiMessage = addMessageToChat('ai', '');
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = `
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
    `;
    aiMessage.querySelector('.message-content').appendChild(typingIndicator);
    
    try {
        state.isGenerating = true;
        
        // Prepare chat history for context
        const chatHistory = extractChatHistory();
        
        // Include images if available
        const imagesParts = [];
        for (const image of state.imageHistory) {
            imagesParts.push({
                inlineData: {
                    data: image.base64.split(',')[1],
                    mimeType: image.type
                }
            });
        }
        
        // Enhance the prompt if creating a project
        let processedMessage = userMessage;
        if (chatFeatures.autoEnhancePrompts && shouldEnhancePrompt(userMessage)) {
            processedMessage = enhancePrompt(userMessage);
        }
        
        if (state.assets.length > 0) {
            const assetNames = state.assets.map(asset => asset.name).join(', ');
            processedMessage = `${processedMessage}\n\nInclude the following uploaded assets: ${assetNames}`;
        }
        
        // Get the model info
        const modelInfo = config.api.AVAILABLE_MODELS.find(model => model.id === state.currentModel);
        let response;
        
        // Generate AI response based on provider
        if (modelInfo.provider === 'google') {
            // Using Google Generative AI
            const model = genAI.getGenerativeModel({
                model: state.currentModel,
                systemInstruction: getSystemInstruction()
            });
            
            const result = await model.generateContent([
                ...imagesParts,
                ...chatHistory,
                { text: processedMessage }
            ]);
            
            response = result.response;
        } else if (modelInfo.provider === 'openrouter') {
            // Using OpenRouter API
            const messages = [
                { role: "system", content: getSystemInstruction() }
            ];
            
            // Add chat history
            chatHistory.forEach(msg => {
                messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.text });
            });
            
            // Prepare final user message with text and images
            const userMessageContent = [];
            userMessageContent.push({ type: "text", text: processedMessage });
            
            // Add images if available
            for (const image of state.imageHistory) {
                userMessageContent.push({
                    type: "image_url",
                    image_url: { url: image.base64 }
                });
            }
            
            messages.push({ role: "user", content: userMessageContent });
            
            // Call OpenRouter API
            const openRouterResponse = await fetch(config.api.OPENROUTER_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${modelInfo.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: state.currentModel,
                    messages: messages
                })
            });
            
            if (!openRouterResponse.ok) {
                throw new Error(`OpenRouter API error: ${openRouterResponse.status} ${openRouterResponse.statusText}`);
            }
            
            const openRouterData = await openRouterResponse.json();
            response = { text: () => openRouterData.choices[0].message.content };
        } else {
            throw new Error(`Unknown provider: ${modelInfo.provider}`);
        }
        
        const responseText = response.text();
        
        // Clear typing indicator
        aiMessage.querySelector('.message-content').innerHTML = '';
        
        // Process and display the response
        renderAIResponse(aiMessage, responseText);
        
        // Extract code blocks and update files
        extractFilesFromResponse(responseText);
        
    } catch (error) {
        console.error('Error generating response:', error);
        aiMessage.querySelector('.message-content').innerHTML = `
            <p>Sorry, I encountered an error:</p>
            <p>${error.message || 'Unable to generate response'}</p>
        `;
    } finally {
        state.isGenerating = false;
        scrollToBottom();
    }
}

// Extract chat history for context
function extractChatHistory() {
    const history = [];
    const messageElements = elements.messages.querySelectorAll('.message');
    
    messageElements.forEach(msg => {
        if (msg.classList.contains('user')) {
            history.push({
                role: 'user',
                text: msg.querySelector('.message-content').textContent.trim()
            });
        } else if (msg.classList.contains('ai')) {
            history.push({
                role: 'model',
                text: msg.querySelector('.message-content').textContent.trim()
            });
        }
    });
    
    // Limit history to last few messages to avoid token limits
    return history.slice(-10).map(item => ({ text: item.text }));
}

// Add a message to the chat
function addMessageToChat(type, content) {
    const message = document.createElement('div');
    message.className = `message ${type}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (content) {
        messageContent.innerHTML = `<p>${content}</p>`;
    }
    
    message.appendChild(messageContent);
    elements.messages.appendChild(message);
    
    scrollToBottom();
    return message;
}

// Render AI response with typing effect
function renderAIResponse(messageElement, text) {
    const contentElement = messageElement.querySelector('.message-content');
    
    // Check if we should hide code blocks
    let processedText = text;
    if (chatFeatures.hideCodeBlocks) {
        // Replace code blocks with a summary
        processedText = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language) => {
            const lang = language || 'code';
            return `<div class="code-block-summary">[${lang.toUpperCase()} block hidden for cleaner view]</div>`;
        });
    }
    
    // Parse markdown
    const sanitizedHtml = DOMPurify.sanitize(marked(processedText));
    contentElement.innerHTML = sanitizedHtml;
    
    // Apply syntax highlighting to code blocks
    contentElement.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
    });
}

// Extract files from AI response
function extractFilesFromResponse(text) {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let filesExtracted = false;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
        const language = match[1]?.toLowerCase() || '';
        const code = match[2].trim();
        
        // Try to determine file name and type
        if (language === 'html' || language === 'htm') {
            state.files['index.html'] = code;
            filesExtracted = true;
        } else if (language === 'css') {
            state.files['styles.css'] = code;
            filesExtracted = true;
        } else if (language === 'javascript' || language === 'js') {
            state.files['script.js'] = code;
            filesExtracted = true;
        } else if (language) {
            // For other languages, use a generic name
            state.files[`file.${language}`] = code;
            filesExtracted = true;
        }
    }
    
    // If we have assets, ensure they are included in appropriate files
    if (state.assets.length > 0) {
        // Create references in the files
        const assetNames = state.assets.map(asset => asset.name);
        
        // For HTML files, check if assets are referenced and add if not
        if (state.files['index.html']) {
            // Image assets for HTML
            state.assets.forEach(asset => {
                if (asset.type.startsWith('image/') && !state.files['index.html'].includes(asset.name)) {
                    // Add reference comment at the end of body
                    state.files['index.html'] = state.files['index.html'].replace(
                        '</body>',
                        `<!-- Asset: ${asset.name} -->\n</body>`
                    );
                }
            });
        }
        
        // For JS files, add asset references
        if (state.files['script.js']) {
            if (!state.files['script.js'].includes('// Asset references')) {
                // Add asset references at the beginning of the file
                let assetRefs = '\n// Asset references\n';
                state.assets.forEach(asset => {
                    const safeVarName = asset.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
                    assetRefs += `const ${safeVarName} = "${asset.base64}";\n`;
                });
                
                state.files['script.js'] = assetRefs + state.files['script.js'];
            }
        }
    }
    
    // If files were extracted, switch to preview
    if (filesExtracted) {
        setTimeout(() => {
            changeView('preview');
        }, 1000);
    }
}

// Render the preview of extracted files
function renderPreview() {
    if (Object.keys(state.files).length === 0) {
        elements.previewFrame.srcdoc = `
            <html>
                <body style="font-family: sans-serif; color: #333; display: flex; justify-content: center; align-items: center; height: 100vh; text-align: center; padding: 20px;">
                    <div>
                        <h2>No content to preview yet</h2>
                        <p>Ask the AI to create something for you in the chat view!</p>
                    </div>
                </body>
            </html>
        `;
        return;
    }
    
    // Combine HTML, CSS, and JS files
    let html = state.files['index.html'] || '';
    const css = state.files['styles.css'] || '';
    const js = state.files['script.js'] || '';
    
    // If no HTML file but we have CSS or JS, create a basic HTML structure
    if (!html && (css || js)) {
        html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Generated Preview</title>
        </head>
        <body>
            <div id="app"></div>
        </body>
        </html>
        `;
    }
    
    // Insert CSS and JS into HTML
    if (html) {
        if (css) {
            html = html.replace('</head>', `<style>${css}</style></head>`);
        }
        if (js) {
            html = html.replace('</body>', `<script>${js}</script></body>`);
        }
    }
    
    // Add the iframe content
    elements.previewFrame.srcdoc = html;
    
    // Create blob URL for opening in new tab if not already created
    if (chatFeatures.newTabPreview && html) {
        createPreviewBlobUrl(html);
    }
}

// Create a blob URL for the preview
function createPreviewBlobUrl(html) {
    // Remove previous blob URL if exists
    if (window.previewBlobUrl) {
        URL.revokeObjectURL(window.previewBlobUrl);
    }
    
    // Create new blob URL
    const blob = new Blob([html], { type: 'text/html' });
    window.previewBlobUrl = URL.createObjectURL(blob);
    
    // Update the open in new tab button
    const newTabButton = document.getElementById('open-new-tab');
    if (newTabButton) {
        newTabButton.href = window.previewBlobUrl;
    }
}

// Download all files as a zip
function downloadAllFiles() {
    if (Object.keys(state.files).length === 0) {
        alert('No files to download');
        return;
    }
    
    // Create a single HTML file with everything bundled
    if (state.files['index.html']) {
        createAndDownloadSingleFile();
    } else {
        // Create individual file downloads for now
        for (const [filename, content] of Object.entries(state.files)) {
            downloadFile(filename, content);
        }
    }
}

// Create and download a single HTML file with all content embedded
function createAndDownloadSingleFile() {
    let html = state.files['index.html'] || '';
    const css = state.files['styles.css'] || '';
    const js = state.files['script.js'] || '';
    
    // Insert CSS and JS into the HTML
    if (css) {
        // Remove existing style tags if present
        html = html.replace(/<style>[\s\S]*?<\/style>/g, '');
        html = html.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
    }
    
    if (js) {
        // Remove existing script tags if present
        html = html.replace(/<script>[\s\S]*?<\/script>/g, '');
        html = html.replace('</body>', `<script>\n${js}\n</script>\n</body>`);
    }
    
    // Add a comment with generation details
    const timestamp = new Date().toLocaleString();
    const comment = `\n<!-- Generated by GenWeb AI on ${timestamp} -->\n`;
    html = html.replace('<html', `${comment}<html`);
    
    // Download as a single file
    downloadFile(`${state.currentProjectName || 'complete-project'}.html`, html);
}

// Render the file list for export view
function renderFileList() {
    elements.fileList.innerHTML = '';
    
    if (Object.keys(state.files).length === 0) {
        elements.fileList.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p>No files have been generated yet. Ask the AI to create something for you!</p>
            </div>
        `;
        return;
    }
    
    for (const [filename, content] of Object.entries(state.files)) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const extension = filename.split('.').pop();
        let fileIcon;
        
        // Set appropriate icon based on file type
        if (extension === 'html') {
            fileIcon = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12,17.56L16.07,16.43L16.62,10.33H9.38L9.2,8.3H16.8L17,6.31H7L7.56,12.32H14.45L14.22,14.9L12,15.5L9.78,14.9L9.64,13.24H7.64L7.93,16.43L12,17.56M4.07,3H19.93L18.5,19.2L12,21L5.5,19.2L4.07,3Z"/></svg>';
        } else if (extension === 'css') {
            fileIcon = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z"/></svg>';
        } else if (extension === 'js') {
            fileIcon = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M3,3H21V21H3V3M7.73,18.04C8.13,18.89 8.92,19.59 10.27,19.59C11.77,19.59 12.8,18.79 12.8,17.04V11.26H11.1V17C11.1,17.86 10.75,18.08 10.2,18.08C9.62,18.08 9.38,17.68 9.11,17.21L7.73,18.04M13.71,17.86C14.21,18.84 15.22,19.59 16.8,19.59C18.4,19.59 19.6,18.76 19.6,17.23C19.6,15.82 18.79,15.19 17.35,14.57L16.93,14.39C16.2,14.08 15.89,13.87 15.89,13.37C15.89,12.96 16.2,12.64 16.7,12.64C17.18,12.64 17.5,12.85 17.79,13.37L19.1,12.5C18.55,11.54 17.77,11.17 16.7,11.17C15.19,11.17 14.22,12.13 14.22,13.4C14.22,14.78 15.03,15.43 16.25,15.95L16.67,16.13C17.45,16.47 17.91,16.68 17.91,17.26C17.91,17.74 17.46,18.09 16.76,18.09C15.93,18.09 15.45,17.66 15.09,17.06L13.71,17.86Z"/></svg>';
        } else {
            fileIcon = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z"/></svg>';
        }
        
        fileItem.innerHTML = `
            <div class="file-item-info">
                <div class="file-item-name">
                    ${fileIcon}
                    <span>${filename}</span>
                </div>
                <div class="file-content">
                    <pre><code class="language-${extension}">${escapeHtml(content)}</code></pre>
                </div>
            </div>
            <div class="file-item-actions">
                <button class="toggle-content" title="Toggle Preview">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                    </svg>
                </button>
                <button class="copy-code" title="Copy Code">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
                    </svg>
                </button>
                <button class="download-file" title="Download File">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
                    </svg>
                </button>
            </div>
        `;
        
        elements.fileList.appendChild(fileItem);
        
        // Apply syntax highlighting
        const codeElement = fileItem.querySelector('code');
        hljs.highlightElement(codeElement);
        
        // Add event listeners
        const toggleButton = fileItem.querySelector('.toggle-content');
        toggleButton.addEventListener('click', () => {
            const fileContent = fileItem.querySelector('.file-content');
            fileContent.classList.toggle('show');
        });
        
        const copyButton = fileItem.querySelector('.copy-code');
        copyButton.addEventListener('click', (e) => {
            const codeElement = fileItem.querySelector('code');
            if (codeElement) {
                navigator.clipboard.writeText(codeElement.textContent)
                .then(() => {
                    showCopyFeedback(copyButton);
                });
            }
        });
        
        const downloadButton = fileItem.querySelector('.download-file');
        downloadButton.addEventListener('click', () => {
            downloadFile(filename, content);
        });
    }
}

// Show copy feedback
function showCopyFeedback(button) {
    const original = button.innerHTML;
    button.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
        </svg>
        Copied!
    `;
    setTimeout(() => {
        button.innerHTML = original;
    }, 2000);
}

// Download a single file
function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Handle image upload - replaced with call to the new image handler module
async function handleImageUpload(event) {
    try {
        const file = event.target.files[0];
        const imageData = await processImage(file);
        
        // Store the image in history
        state.imageHistory.push(imageData);
        
        // Add image reference to input
        elements.userInput.value = `${createImagePromptText(imageData)} ${elements.userInput.value}`;
        
        // Focus on input
        elements.userInput.focus();
    } catch (error) {
        console.error('Error processing image:', error);
        alert(error.message);
    }
}

// Handle pasting images from clipboard
async function handleImagePaste(e) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    
    for (const item of items) {
        if (item.type.indexOf('image') === 0) {
            e.preventDefault();
            
            const file = item.getAsFile();
            try {
                const imageData = await processImage(file);
                
                // Store the image in history
                state.imageHistory.push(imageData);
                
                // Add image reference to input or update existing one
                if (elements.userInput.value.includes('[Using the uploaded image')) {
                    elements.userInput.value = elements.userInput.value.replace(
                        /\[Using the uploaded image[^\]]*\]/,
                        createImagePromptText(imageData)
                    );
                } else {
                    elements.userInput.value = `${createImagePromptText(imageData)} ${elements.userInput.value}`;
                }
                
                // Let the user know image was pasted successfully
                const pasteNotification = document.createElement('div');
                pasteNotification.className = 'paste-notification';
                pasteNotification.textContent = 'Image pasted! Ready to send.';
                document.body.appendChild(pasteNotification);
                
                setTimeout(() => {
                    pasteNotification.remove();
                }, 2000);
            } catch (error) {
                console.error('Error processing pasted image:', error);
                alert(error.message);
            }
            break;
        }
    }
}

// Handle asset upload
async function handleAssetUpload(event) {
    try {
        const file = event.target.files[0];
        const assetData = await processAsset(file);
        
        // Store the asset in state
        state.assets.push(assetData);
        
        // Create asset preview
        const assetPreview = createAssetPreview(assetData);
        
        // Check if asset container exists, create if not
        let assetContainer = document.querySelector('.asset-list');
        if (!assetContainer) {
            const assetSection = document.createElement('div');
            assetSection.className = 'asset-uploads';
            
            assetContainer = document.createElement('div');
            assetContainer.className = 'asset-list';
            
            assetSection.appendChild(assetContainer);
            
            // Add to user input area
            const userInputArea = document.querySelector('.input-area');
            userInputArea.insertBefore(assetSection, elements.userInput);
        }
        
        // Add to container
        assetContainer.appendChild(assetPreview);
        
        // Update user input to mention assets
        if (elements.userInput.value && !elements.userInput.value.includes('[Using uploaded assets')) {
            elements.userInput.value = `${createAssetPromptText(state.assets)} ${elements.userInput.value}`;
        } else if (!elements.userInput.value) {
            elements.userInput.value = `${createAssetPromptText(state.assets)} Please incorporate these assets into the project.`;
        }
        
        // Create notification for successful upload
        const notification = document.createElement('div');
        notification.className = 'paste-notification';
        notification.textContent = `Asset "${assetData.name}" uploaded successfully!`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
        
    } catch (error) {
        console.error('Error processing asset:', error);
        alert(error.message);
    }
}

// Clear assets when starting a new chat
function clearChatAndAssets() {
    // Clear chat
    elements.messages.innerHTML = '';
    
    // Reset state
    state.files = {};
    state.imageHistory = [];
    state.assets = [];
    
    // Clear assets
    clearAssets();
    window.state.assets = [];
    
    // Switch to chat view
    changeView('chat');
    
    // Reset input
    elements.userInput.value = '';
    elements.userInput.style.height = 'auto';
    
    // Create new project in history
    updateProjectHistory(true);
    
    // Reset project name
    state.currentProjectName = 'Untitled Project';
    if (elements.projectNameInput) {
        elements.projectNameInput.value = state.currentProjectName;
    }
}

// Helper functions
function scrollToBottom() {
    elements.messages.scrollTop = elements.messages.scrollHeight;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Project functions
function updateProjectHistory(createNew = false) {
    if (createNew) {
        createProject(state.currentProjectName);
    } else {
        // Update name first if it exists
        const currentProject = getCurrentProject();
        if (currentProject) {
            currentProject.name = state.currentProjectName;
        }
        
        // Then update the full project with deep copies of state objects
        updateCurrentProject({
            files: {...state.files},
            assets: state.assets.map(asset => ({...asset})),
            imageHistory: state.imageHistory.map(img => ({...img}))
        });
    }
    
    // Refresh projects list
    renderProjectsList();
}

function saveCurrentProject() {
    // Update project name from input
    state.currentProjectName = elements.projectNameInput.value;
    
    // Validate project name
    if (!state.currentProjectName || state.currentProjectName.trim() === '') {
        showNotification('Please enter a project name before saving', 'error');
        elements.projectNameInput.focus();
        return;
    }
    
    // Save current project state
    if (updateProjectHistory() === null) {
        // If no current project, create a new one
        updateProjectHistory(true);
    }
    
    // Show confirmation
    showNotification('Project saved successfully!');
}

function createNewProject() {
    // Clear state
    clearChatAndAssets();
    
    // Reset project name
    state.currentProjectName = 'Untitled Project';
    elements.projectNameInput.value = state.currentProjectName;
    
    // Create new project in history
    updateProjectHistory(true);
    
    // Show confirmation
    showNotification('New project created!');
}

function updateProjectName() {
    state.currentProjectName = elements.projectNameInput.value || 'Untitled Project';
    updateProjectHistory();
}

function renderProjectsList() {
    if (!elements.projectsList) return;
    
    elements.projectsList.innerHTML = '';
    
    const projects = getAllProjects();
    
    if (projects.length === 0) {
        elements.projectsList.innerHTML = `
            <div style="text-align: center; padding: 2rem; opacity: 0.7;">
                <p>No saved projects yet</p>
            </div>
        `;
        return;
    }
    
    projects.forEach(project => {
        const projectItem = document.createElement('div');
        projectItem.className = 'project-item';
        
        // Format date
        const date = new Date(project.updated);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        projectItem.innerHTML = `
            <div class="project-item-info">
                <div class="project-item-name">${project.name}</div>
                <div class="project-item-date">Last updated: ${formattedDate}</div>
            </div>
            <div class="project-item-actions">
                <button class="load-project" data-id="${project.id}" title="Load Project">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                </button>
                <button class="delete-project delete" data-id="${project.id}" title="Delete Project">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                    </svg>
                </button>
            </div>
        `;
        
        elements.projectsList.appendChild(projectItem);
        
        // Add event listeners
        const loadButton = projectItem.querySelector('.load-project');
        loadButton.addEventListener('click', () => {
            loadProjectById(project.id);
        });
        
        const deleteButton = projectItem.querySelector('.delete-project');
        deleteButton.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
                deleteProjectById(project.id);
            }
        });
    });
}

function loadProjectById(id) {
    // Load project into current state
    if (loadProject(id, state)) {
        // Update project name input
        const project = getCurrentProject();
        if (project) {
            state.currentProjectName = project.name;
            elements.projectNameInput.value = project.name;
        }
        
        // Render preview
        renderPreview();
        
        // Show confirmation
        showNotification('Project loaded successfully!');
        
        // Switch to chat view
        changeView('chat');
    } else {
        showNotification('Failed to load project', 'error');
    }
}

function deleteProjectById(id) {
    if (deleteProject(id)) {
        renderProjectsList();
        showNotification('Project deleted');
    } else {
        showNotification('Failed to delete project', 'error');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `paste-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// Initialize the app
function initApp() {
    setupEventListeners();
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);