export const METHOD = {
    GET: "GET",
    POST: "POST",
};

export const CONTENT_TYPE = {
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".json": "application/json",
    ".xml": "application/xml",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".csv": "text/csv",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".avif": "image/avif",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".wasm": "application/wasm",
};

export const DEFAULT_CONTENT_TYPE = "application/octet-stream";

export const MEDIA_EXTENSIONS = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".avif",
    ".svg",
    ".mp3",
    ".wav",
    ".ogg",
    ".mp4",
    ".webm",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
    ".pdf",
    ".zip",
    ".wasm",
];

export const FLAG_SCHEMAS = {
    "--port": { type: 'number', name: 'port' },
    "--host": { type: 'string', name: 'host' },
    "--open": { type: 'string', name: 'open' },
    "--no-open": { type: null, name: 'noOpen' },
};

export const FLAGS = Object.keys(FLAG_SCHEMAS);

export const DEFAULT_WATCHER_IGNORED = [
    // Package managers / deps
    '**/node_modules/**',
    '**/.pnpm/**',
    '**/.yarn/**',

    // VCS
    '**/.git/**',
    '**/.hg/**',
    '**/.svn/**',

    // Build outputs
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/.next/**',
    '**/.nuxt/**',
    '**/.cache/**',
    '**/.turbo/**',

    // Logs
    '**/*.log',

    // OS junk
    '**/.DS_Store',
    '**/Thumbs.db',

    // Editors
    '**/.vscode/**',
    '**/.idea/**',

    // Temp files
    '**/*.tmp',
    '**/*.swp',
    '**/*~'
];
