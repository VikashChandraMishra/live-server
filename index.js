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
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Not Found');
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