const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const { METHOD } = require('./constants');

const port = process.env.PORT || 5500;
const baseDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

const baseDirectoryitems = fs.readdirSync(baseDir, { withFileTypes: true });

const server = http.createServer((req, res) => {
    const { method, url } = req;
    let filePath = path.join(baseDir, req.url === '/' ? 'index.html' : req.url);

    if (method == METHOD.GET) {
        if (url == '/') {
            if (!fs.existsSync(filePath)) {
                filePath = path.join(baseDir, 'index.htm');
                if (!fs.existsSync(filePath)) {
                    let data = fs.readFileSync(path.join(baseDir, 'fallback.html'), 'utf-8');

                    let html = "";

                    for (let item of baseDirectoryitems) {
                        if (item.isDirectory()) {
                            html += `<div class="item dir">📁 ${item.name}</div>`;
                        } else if (item.isFile()) {
                            html += `<div class="item file">📄 ${item.name}</div>`;
                        } else {
                            html += `<div class="item other">❓ ${item.name}</div>`;
                        }
                    }

                    data = data.replace('{{contents}}', html); data = data.replace(
                        '</body>',
                            `<script>
                                const ws = new WebSocket('ws://localhost:5500');
                                ws.onmessage = (event) => {
                                    if (event.data == 'change') {
                                        location.reload();                        
                                    }
                                };
                            </script>
                        </body>`
                    );
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(data);
                    return;
                }
            }

            let data = fs.readFileSync(filePath, 'utf-8');
            data = data.replace(
                '</body>',
                `<script>
                    const ws = new WebSocket('ws://localhost:5500');
                    ws.onmessage = (event) => {
                        if (event.data == 'change') {
                            location.reload();                        
                        }
                    };
                </script></body>`
            );

            res.writeHead(200, { 'Content-Type': 'text/html' });
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

chokidar.watch(baseDir).on('all', (event, path) => {
    for (const ws of clients) {
        ws.send(event);
    }
});
