// Functions for handling image processing and AI image analysis
import { config } from './config.js';

// Process uploaded images for AI input
export async function processImage(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }
        
        // Check file size
        if (file.size > config.ui.MAX_IMAGE_SIZE) {
            reject(new Error(`Image too large. Maximum size is ${config.ui.MAX_IMAGE_SIZE / (1024 * 1024)}MB.`));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve({
                base64: e.target.result,
                type: file.type,
                name: file.name
            });
        };
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
    });
}

// Display image preview in the chat
export function createImagePreview(imageData) {
    const imagePreview = document.createElement('div');
    imagePreview.className = 'image-preview';
    
    const img = document.createElement('img');
    img.src = imageData.base64;
    img.alt = 'Uploaded image';
    img.className = 'uploaded-image';
    
    const caption = document.createElement('div');
    caption.className = 'image-caption';
    caption.textContent = `Image: ${imageData.name || 'uploaded image'}`;
    
    imagePreview.appendChild(img);
    imagePreview.appendChild(caption);
    
    return imagePreview;
}

// Create text description based on image for augmenting prompts
export function createImagePromptText(imageData) {
    return `[Using the uploaded image as reference]`;
}