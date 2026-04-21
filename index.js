import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import chokidar from 'chokidar';
import { METHOD, CONTENT_TYPE, MEDIA_EXTENSIONS } from './constants.js';
import { renderDirectoriesAndFiles, attachWebsocketClientToHTML, renderFallbackPage, validatePort } from './util.js';
import { validateHost } from './validateHost.js';

const hostArgIndex = process.argv.indexOf("--host");
const hostArg = hostArgIndex !== -1 ? process.argv[hostArgIndex + 1] : undefined;

if (hostArg !== undefined) {
    const { ok, error } = await validateHost(hostArg);
    if (!ok) {
        console.error("Invalid host:", error);
        process.exit(1);
    }
}

const portArgIndex = process.argv.indexOf("--port");
const portArg = portArgIndex !== -1 ? process.argv[portArgIndex + 1] : undefined;

if (portArg !== undefined) {
    const { ok, error } = validatePort(portArg);
    if (!ok) {
        console.error("Invalid port:", error);
        process.exit(1);
    }
}

const host = hostArg ?? '127.0.0.1';
const port = portArg ?? process.env.PORT ?? 5500;
const noOpen = process.argv.includes("--no-open");
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

            const data = MEDIA_EXTENSIONS.includes(extName)
                ? fs.readFileSync(filePath)           // Buffer (binary)
                : fs.readFileSync(filePath, 'utf-8'); // string (text)

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

const openURL = (url) => {
    let command, args;

    if (process.platform === "win32") {
        command = "cmd";
        args = ["/c", "start", "", url];
    } else if (process.platform === "darwin") {
        command = "open";
        args = [url];
    } else {
        command = "xdg-open";
        args = [url];
    }

    const child = spawn(command, args, {
        detached: true,
        stdio: "ignore"
    });

    child.on("error", (err) => {
        console.error("Failed to open browser:", err.message);
        console.log("Fallback: please open this URL manually:");
        console.log(url);
    });

    child.unref();
};

server.listen(port, host, () => {
    try {
        const { address } = server.address();
        let starterUrl = `http://${['::', '[::]'].includes(address) ? '[::1]' : '127.0.0.1'}:${port}`;

        if (!noOpen) {
            openURL(starterUrl);
        }
    } catch (error) {
        console.log(error);
    }

    console.log(`Server listening on http://${host}:${port}`);
});
``
server.on('error', (err) => {
    console.error('Server error:', err.message);
});

const wss = new WebSocketServer({ server });

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
