const http = require('http');
const path = require('path');
const fs = require('fs');
const { METHOD } = require('./constants');

const port = process.env.PORT || 5500;
const baseDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

const server = http.createServer((req, res) => {
    const { method, url } = req;
    let filePath = path.join(baseDir, req.url === '/' ? 'index.html' : req.url);

    if (method == METHOD.GET) {
        if (url == '/') {
            if (!fs.existsSync(filePath)) {
                filePath = path.join(baseDir, 'index.htm');
                if (!fs.existsSync(filePath)) {
                    const baseDirectoryitems = fs.readdirSync(baseDir, { withFileTypes: true });
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

                    html = `
                        <style>
                        .container {
                            max-width: 800px;
                            margin: 40px auto;
                            font-family: system-ui, sans-serif;
                        }

                        .item {
                            padding: 10px 14px;
                            border-bottom: 1px solid #eee;
                        }

                        .item:hover {
                            background: #f5f5f5;
                            cursor: pointer;
                        }

                        .dir {
                            font-weight: 600;
                            color: #2c3e50;
                        }

                        .file {
                            color: #555;
                        }

                        .other {
                            color: #999;
                            font-style: italic;
                        }
                        </style>

                        <div class="container">
                            <h2>Directory Listing</h2>
                            ${html}
                        </div>
                        `;

                    data = data.replace('{{contents}}', html);
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(data);
                    return;
                }
            }
            const data = fs.readFileSync(filePath);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
            return;
        }
    }

    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
});

server.listen(port, () => {
    console.log("Server listening on port ", port);
});

server.on('error', (err) => {
    console.error('Server error:', err.message);
});