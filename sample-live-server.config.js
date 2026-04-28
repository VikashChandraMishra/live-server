export default {
    server: {
        port: 5500,                                      // port to listen on
        host: '127.0.0.1',                               // interface to bind to ("0.0.0.0" for LAN access)
        baseDir: '.',                                    // directory of files to serve
    },

    https: {
        enabled: false,                                  // serve over HTTPS instead of HTTP
        key: './certs/localhost-key.pem',                // PEM-encoded private key
        cert: './certs/localhost.pem',                   // PEM-encoded certificate
    },

    watch: {
        ignore: ['node_modules', '.git', 'dist', '**/*.log'],  // glob patterns the file watcher skips
    },

    proxy: {
        '/api': {
            target: 'https://api.example.com',           // backend origin to forward to
            pathRewrite: { '^/api': '' },                // regex → replacement applied to request path
            headers: { 'X-Dev-Mode': 'true' },           // extra headers added to forwarded requests
        },
        '/socket': {
            target: 'wss://realtime.example.com',        // backend origin (WebSocket)
            ws: true,                                    // forward WebSocket upgrade requests
        },
    },
};
