const http = require('http');

const port = process.env.PORT || 5500;

const server = http.createServer((_req, res) => {
    res.end('Hello World!');
});

server.listen(port);
