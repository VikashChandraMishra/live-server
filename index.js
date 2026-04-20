const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const { METHOD, CONTENT_TYPE } = require('./constants');
const { renderDirectoriesAndFiles, attachWebsocketClientToHTML, renderFallbackPage } = require('./util');

const port = process.env.PORT || 5500;
const baseDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

let baseDirectoryitems = fs.readdirSync(baseDir, { withFileTypes: true });

// TODO: Decide how to handle the path to the fallback page
const fallbackPageHtml = fs.readFileSync(path.join(process.cwd(), 'fallback.html'), 'utf-8');

const server = http.createServer((req, res) => {
    const { method, url } = req;
    let filePath = path.resolve(baseDir, '.' + (req.url === '/' ? '/index.html' : req.url));

    // Block path traversal: after `..` segments are resolved, the final path
    // must still live under baseDir. The trailing separator prevents sibling
    // prefixes (e.g. `D:\app-secrets`) from passing a check against `D:\app`.
    if (filePath !== baseDir && !filePath.startsWith(baseDir + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    if (method == METHOD.GET) {
        if (url == '/') {
            if (!fs.existsSync(filePath)) {
                filePath = path.join(baseDir, 'index.htm');
                if (!fs.existsSync(filePath)) {
                    const data = renderFallbackPage(fallbackPageHtml, path.dirname(filePath));
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(data);
                    return;
                }
            }

            let data = fs.readFileSync(filePath, 'utf-8');
            data = attachWebsocketClientToHTML(data);

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
            return;
        } else {
            // Render the fallback either if the filepath is incorrect or points to a directory
            if (!fs.existsSync(filePath)) {
                const data = renderFallbackPage(fallbackPageHtml, path.dirname(filePath));
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(data);
                return;
            } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
                const data = renderFallbackPage(fallbackPageHtml, filePath);
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(data);
                return;
            }

            const extName = path.extname(filePath).toLowerCase();

            let data = fs.readFileSync(filePath, 'utf-8');

            if ([CONTENT_TYPE['.html'], CONTENT_TYPE['.htm']].includes(extName)) {
                data = attachWebsocketClientToHTML(data);
            }

            res.writeHead(200, { 'Content-Type': CONTENT_TYPE[extName] || DEFAULT_CONTENT_TYPE });
            res.end(data);
            return;
        }
    }

    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
});

server.listen(port, () => {
    console.log("Server listening on port ", port);
});

server.on('error', (err) => {
    console.error('Server error:', err.message);
});

const wss = new WebSocket.Server({ server });

const clients = new Set();

wss.on('connection', (ws) => {
    console.log('client connected');
    clients.add(ws);
    ws.send('server connected');
    ws.on('close', () => clients.delete(ws));
});

chokidar.watch(baseDir).on('all', (event, filePath) => {
    baseDirectoryitems = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const ws of clients) {
        ws.send(event);
    }
});
