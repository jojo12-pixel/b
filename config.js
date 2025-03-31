// Configuration settings for GenWeb AI
export const config = {
    // API configuration
    api: {
        KEY: 'AIzaSyAiAXPsyu9g_nM1_r-Ba90fmEHGCDX7MP4',
        MODEL_NAME: 'gemini-2.5-pro-exp-03-25',
        AVAILABLE_MODELS: [
            { id: 'gemini-2.5-pro-exp-03-25', name: 'Gemini 2.5 Pro', provider: 'google' },
            { id: 'gemini-2.0-flash-thinking-exp-01-21', name: 'Gemini 2.0 Flash Thinking', provider: 'google' },
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'google' },
            { id: 'gemini-2.0-flash-exp-02-05', name: 'Gemini 2.0 Flash (02-05)', provider: 'google' },
            { id: 'qwen/qwen2.5-vl-72b-instruct:free', name: 'Qwen 2.5 VL 72B', provider: 'openrouter', apiKey: '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' },
            { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B', provider: 'openrouter', apiKey: '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' }
        ],
        MAX_TOKENS: 8192,
        TEMPERATURE: 0.7,
        OPENROUTER_URL: 'https://openrouter.ai/api/v1/chat/completions'
    },
    
    // UI configuration
    ui: {
        DEFAULT_THEME: 'dark', // 'dark' or 'light'
        MESSAGE_TYPING_SPEED: 10, // Characters per frame for typing effect
        MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB max image upload size
        IMAGE_PREVIEW_MAX_HEIGHT: 300, // Maximum height for image previews in pixels
        MAX_ASSET_SIZE: 10 * 1024 * 1024, // 10MB max asset upload size
        ALLOWED_ASSET_TYPES: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.mp3', '.wav', '.ogg', '.json', '.ttf', '.otf'],
        STORAGE_KEY: 'genweb_projects' // Local storage key for saved projects
    },
    
    // Default welcome message
    welcomeMessage: "Hello! I'm GenWeb AI. I can help you create websites, web apps, games, and more just from text prompts or images. Try uploading an image or asking me to create something for you!"
};