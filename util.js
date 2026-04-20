import fs from "fs";

export const renderDirectoriesAndFiles = (items) => {
    let html = "";

    for (let item of items) {
        if (item.isDirectory()) {
            html += `<div class="item dir">📁 ${item.name}</div>`;
        } else if (item.isFile()) {
            html += `<div class="item file">📄 ${item.name}</div>`;
        } else {
            html += `<div class="item other">❓ ${item.name}</div>`;
        }
    }

    return html;
};

export const attachWebsocketClientToHTML = (html) => {
    return html.replace(
        '</body>',
        `
            <script>
                const ws = new WebSocket('ws://localhost:5500');
                ws.onmessage = (event) => {
                    if (event.data == 'change') {
                        location.reload();                        
                    }
                };
            </script>
        </body>`
    );
};

export const renderFallbackPage = (fallbackPageHtml, dirName) => {
    let items = fs.readdirSync(dirName, { withFileTypes: true });
    let html = renderDirectoriesAndFiles(items);
    let data = fallbackPageHtml.replace('{{contents}}', html);
    data = attachWebsocketClientToHTML(data);
    return data;
};
