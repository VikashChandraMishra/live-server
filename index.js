import { spawn } from 'child_process';
import chokidar from 'chokidar';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { pathToFileURL } from 'url';
import { WebSocketServer } from 'ws';
import { extractFlags, validateFlags } from './cli-parser.js';
import { CONTENT_TYPE, DEFAULT_CONTENT_TYPE, DEFAULT_WATCHER_IGNORED, MEDIA_EXTENSIONS, METHOD } from './constants.js';
import { attachWebsocketClientToHTML, filePathToUrl, isArg, loadWatcherIgnore, renderFallbackPage } from './util.js';

const extracted = extractFlags(process.argv);
if (!extracted.ok) {
    console.error(extracted.error);
    process.exit(1);
}

const validated = await validateFlags(extracted.value);
if (!validated.ok) {
    console.error(validated.error);
    process.exit(1);
}

const { host: hostArg, port: portArg, noOpen: noOpenArg, open: openArg } = extracted.value;

const host = hostArg ?? '127.0.0.1';
const port = portArg ?? process.env.PORT ?? 5500;
const noOpen = noOpenArg ?? false;
const openPath = openArg ?? '/';

const baseDir = process.argv[2] && !isArg(process.argv[2]) ? path.resolve(process.argv[2]) : process.cwd();
let baseDirectoryitems = fs.readdirSync(baseDir, { withFileTypes: true });
const config = baseDirectoryitems.find(
    (item) => item.isFile() && item.name === 'live-server.config.js'
);
let watcherIgnoredFiles = await loadWatcherIgnore(config);
watcherIgnoredFiles = watcherIgnoredFiles.length > 0 ? watcherIgnoredFiles : DEFAULT_WATCHER_IGNORED;

// TODO: Decide how to handle the path to the fallback page
const fallbackPageHtml = fs.readFileSync(path.join(process.cwd(), 'fallback.html'), 'utf-8');

const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    const { method, url } = req;
    const pathname = url.split('?')[0];
    let filePath = path.resolve(baseDir, '.' + (pathname === '/' ? '/index.html' : pathname));

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
                    const data = renderFallbackPage(fallbackPageHtml, path.dirname(filePath), '/');
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
                const data = renderFallbackPage(fallbackPageHtml, baseDir, '/');
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(data);
                return;
            } else if (fs.existsSync(filePath)) {
                if (fs.statSync(filePath).isDirectory()) {
                    const data = renderFallbackPage(fallbackPageHtml, filePath, pathname);
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(data);
                    return;
                }

                const extName = path.extname(filePath).toLowerCase();

                let data = MEDIA_EXTENSIONS.includes(extName)
                    ? fs.readFileSync(filePath)           // Buffer (binary)
                    : fs.readFileSync(filePath, 'utf-8'); // string (text)

                if (['.html', '.htm'].includes(extName)) {
                    data = attachWebsocketClientToHTML(data);
                }

                res.writeHead(200, { 'Content-Type': CONTENT_TYPE[extName] || DEFAULT_CONTENT_TYPE });
                res.end(data);
                return;
            }
        }
    }

    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden: Method not allowed');
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
        let starterUrl = `http://${['::', '[::]'].includes(address) ? '[::1]' : '127.0.0.1'}:${port}${openPath}`;

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
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
    } else {
        console.error('Server error:', err.message);
    }
    process.exit(1);
});

const wss = new WebSocketServer({ server });

const clients = new Set();

wss.on('connection', (ws) => {
    console.log('client connected');
    clients.add(ws);
    ws.send(JSON.stringify({ event: 'server connected' }));
    ws.on('close', () => clients.delete(ws));
});

chokidar.watch(baseDir, {
    ignored: watcherIgnoredFiles
})
    .on('all', (event, filePath) => {
        const relativeFilePath = filePathToUrl(baseDir, filePath);
        const isCssUpdate = path.extname(relativeFilePath) === ".css";
        baseDirectoryitems = fs.readdirSync(baseDir, { withFileTypes: true });

        for (const ws of clients) {
            if (isCssUpdate) {
                ws.send(JSON.stringify({
                    event: "css-update",
                    file: relativeFilePath
                }));
            } else {
                ws.send(JSON.stringify({ event: "change" }));
            }
        }
    });
