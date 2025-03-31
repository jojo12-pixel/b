// Functions for managing uploaded assets for web/game projects
import { config } from './config.js';

// Store for all uploaded assets
const assetStore = {
    assets: [],
    assetMap: {} // For quick lookups by filename
};

// Process and store uploaded assets
export async function processAsset(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }
        
        // Check file size
        if (file.size > config.ui.MAX_ASSET_SIZE) {
            reject(new Error(`Asset too large. Maximum size is ${config.ui.MAX_ASSET_SIZE / (1024 * 1024)}MB.`));
            return;
        }
        
        // Validate file extension
        const fileName = file.name.toLowerCase();
        const fileExt = '.' + fileName.split('.').pop();
        
        if (!config.ui.ALLOWED_ASSET_TYPES.includes(fileExt)) {
            reject(new Error(`Unsupported file type. Allowed types: ${config.ui.ALLOWED_ASSET_TYPES.join(', ')}`));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const asset = {
                id: generateAssetId(),
                name: file.name,
                type: file.type,
                size: file.size,
                base64: e.target.result,
                url: URL.createObjectURL(file),
                uploadedAt: new Date().toISOString()
            };
            
            // Add to asset store
            assetStore.assets.push(asset);
            assetStore.assetMap[asset.name] = asset;
            
            resolve(asset);
        };
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
    });
}

// Generate a unique asset ID
function generateAssetId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Get all assets
export function getAllAssets() {
    return assetStore.assets;
}

// Get asset by name
export function getAssetByName(name) {
    return assetStore.assetMap[name] || null;
}

// Create asset preview element for display in UI
export function createAssetPreview(asset) {
    const assetPreview = document.createElement('div');
    assetPreview.className = 'asset-preview';
    
    // Different preview based on asset type
    if (asset.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = asset.url;
        img.alt = asset.name;
        img.className = 'asset-thumbnail';
        assetPreview.appendChild(img);
    } else if (asset.type.startsWith('audio/')) {
        const audio = document.createElement('audio');
        audio.src = asset.url;
        audio.controls = true;
        assetPreview.appendChild(audio);
        
        // Add audio icon
        const audioIcon = document.createElement('div');
        audioIcon.className = 'asset-icon audio-icon';
        audioIcon.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>
            </svg>
        `;
        assetPreview.appendChild(audioIcon);
    } else {
        // Generic file icon for other types
        const fileIcon = document.createElement('div');
        fileIcon.className = 'asset-icon file-icon';
        fileIcon.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
        `;
        assetPreview.appendChild(fileIcon);
    }
    
    const caption = document.createElement('div');
    caption.className = 'asset-caption';
    caption.textContent = asset.name;
    
    assetPreview.appendChild(caption);
    
    // Add size info
    const sizeInfo = document.createElement('div');
    sizeInfo.className = 'asset-size';
    sizeInfo.textContent = formatFileSize(asset.size);
    assetPreview.appendChild(sizeInfo);
    
    return assetPreview;
}

// Format file size to human readable format
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Create text description for prompting with assets
export function createAssetPromptText(assets) {
    if (assets.length === 0) return '';
    
    let prompt = `[Using the following uploaded assets:`;
    assets.forEach(asset => {
        const type = asset.type.split('/')[0];
        prompt += `\n- ${asset.name} (${type})`;
    });
    prompt += `]`;
    
    return prompt;
}

// Process assets into a format suitable for project generation
export function prepareAssetsForProject(assets) {
    const assetsByType = {
        images: [],
        audio: [],
        fonts: [],
        data: []
    };
    
    assets.forEach(asset => {
        if (asset.type.startsWith('image/')) {
            assetsByType.images.push(asset);
        } else if (asset.type.startsWith('audio/')) {
            assetsByType.audio.push(asset);
        } else if (asset.name.endsWith('.ttf') || asset.name.endsWith('.otf')) {
            assetsByType.fonts.push(asset);
        } else if (asset.name.endsWith('.json')) {
            assetsByType.data.push(asset);
        }
    });
    
    return assetsByType;
}

// Generate asset import code for different project types
export function generateAssetImportCode(assets, projectType = 'web') {
    let code = '';
    
    if (projectType === 'web' || projectType === 'game') {
        // Generate JS import code
        code += `// Asset imports\n`;
        assets.forEach(asset => {
            const varName = asset.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
            code += `const ${varName} = "${asset.base64}";\n`;
        });
    }
    
    return code;
}

// Clear assets when starting a new project
export function clearAssets() {
    assetStore.assets.forEach(asset => {
        if (asset.url) {
            URL.revokeObjectURL(asset.url);
        }
    });
    assetStore.assets = [];
    assetStore.assetMap = {};
}