import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.env.PORT || 4173;
const BASE_PATH = process.env.BASE_PATH || '/';
const root = process.cwd();

// Normalize BASE_PATH to start and end with '/'
let normalizedBasePath = BASE_PATH;
if (!normalizedBasePath.startsWith('/')) {
  normalizedBasePath = '/' + normalizedBasePath;
}
if (!normalizedBasePath.endsWith('/')) {
  normalizedBasePath = normalizedBasePath + '/';
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname;

  // Strip BASE_PATH prefix
  if (normalizedBasePath !== '/') {
    if (!pathname.startsWith(normalizedBasePath)) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }
    pathname = pathname.substring(normalizedBasePath.length - 1);
    if (pathname === '') pathname = '/';
  }

  // Resolve path and prevent traversal
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch (e) {
    res.statusCode = 400;
    res.end('Bad Request: Malformed URL encoding');
    return;
  }

  const requestedPath = path.join(root, '.' + decodedPath);
  const resolvedPath = path.resolve(requestedPath);

  // Check if the resolved path is within the root directory
  if (!resolvedPath.startsWith(root + path.sep) && resolvedPath !== root) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  // Refuse any path segment starting with '.' (e.g., .git, .smoke, etc.)
  const segments = decodedPath.split(path.sep);
  if (segments.some(s => s.startsWith('.'))) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  // Handle directory index
  let targetPath = resolvedPath;
  if (pathname === '/' || pathname.endsWith('/')) {
    targetPath = path.join(resolvedPath, 'index.html');
  }

  if (fs.existsSync(targetPath) && fs.lstatSync(targetPath).isFile()) {
    serveFile(targetPath, res);
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.end('Internal Server Error');
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.end(data);
  });
}

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}${normalizedBasePath}`);
});
