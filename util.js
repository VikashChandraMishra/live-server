import fs from "fs";
import path from "path";

export const renderDirectoriesAndFiles = (items, urlPrefix) => {
    const base = urlPrefix.endsWith("/") ? urlPrefix : urlPrefix + "/";
    const linkStyle = `style="text-decoration: none; color: inherit;"`;
    let html = "";

    for (let item of items) {
        const encoded = encodeURIComponent(item.name);
        if (item.isDirectory()) {
            html += `<div class="item dir"><a href="${base}${encoded}/" ${linkStyle}>📁 ${item.name}</a></div>`;
        } else if (item.isFile()) {
            html += `<div class="item file"><a href="${base}${encoded}" ${linkStyle}>📄 ${item.name}</a></div>`;
        } else {
            html += `<div class="item other"><a href="${base}${encoded}" ${linkStyle}>❓ ${item.name}</a></div>`;
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
                    const data = JSON.parse(event.data);

                    if (data.event == 'change') {
                        location.reload();                        
                    } else if (data.event == 'css-update') {
                        const links = document.querySelectorAll('link[rel="stylesheet"]');
                        for (const link of links) {
                            if (new URL(link.href).pathname === data.file) {
                                link.href = data.file + '?t=' + Date.now();
                                break;
                            }
                        }
                    }
                };
            </script>
        </body>`
    );
};

export const renderFallbackPage = (fallbackPageHtml, dirName, urlPrefix) => {
    let items = fs.existsSync(dirName) ? fs.readdirSync(dirName, { withFileTypes: true }) : [];
    let html = renderDirectoriesAndFiles(items, urlPrefix);
    let data = fallbackPageHtml.replace('{{contents}}', html);
    data = attachWebsocketClientToHTML(data);
    return data;
};

export const validatePort = (port) => {
    const portNumber = Number(port);

    if (!Number.isInteger(portNumber)) {
        return { ok: false, error: "Port must be an integer" };
    }

    if (portNumber < 3000 || portNumber > 9000) {
        return { ok: false, error: "Port must be between 3000 and 9000" };
    }

    return { ok: true };
};

export const isArg = (str) => {
    return str.startsWith("--");
};

export const validateOpenPath = (openPath) => {
    if (typeof openPath !== "string" || openPath.trim() === "") {
        return { ok: false, error: "Path must be a non-empty string" };
    }

    if (/[\x00-\x1F\x7F]/.test(openPath)) {
        return { ok: false, error: "Path must not contain control characters" };
    }

    if (openPath.includes("\\")) {
        return { ok: false, error: "Path must use forward slashes, not backslashes" };
    }

    if (openPath.startsWith("//")) {
        return { ok: false, error: "Path must not be protocol-relative" };
    }

    if (/^[a-zA-Z][a-zA-Z0-9+.\-]*:/.test(openPath)) {
        return { ok: false, error: "Path must not include a URL scheme or drive letter" };
    }

    if (openPath.includes("@")) {
        return { ok: false, error: "Path must not contain userinfo (@)" };
    }

    if (!openPath.startsWith("/")) {
        return { ok: false, error: "Path must start with '/'" };
    }

    if (openPath.split("/").includes("..")) {
        return { ok: false, error: "Path must not contain '..' segments" };
    }

    return { ok: true };
};

// Different HTML files may use:
// <link href="../styles/main.css">
// <link href="/styles/main.css">
// <link href="styles/main.css"></link>
// But in the browser, all of these resolve to the same absolute URL:
// /styles/main.css

export const filePathToUrl = (baseDir, filePath) => {
    const relativePath = path.relative(baseDir, filePath);

    return "/" + relativePath.split(path.sep).join("/");
};
