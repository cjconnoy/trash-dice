const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || process.cwd());
const port = Number(process.argv[3] || 5175);
const lockedBuilds = {
  dc5a995: {
    '/': 'releases/alpha-complete/index.html',
    '/index.html': 'releases/alpha-complete/index.html',
    '/trash-dice.html': 'releases/alpha-complete/trash-dice.html'
  }
};
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function isInsideRoot(target) {
  return target === root || target.startsWith(root + path.sep);
}

function resolveTarget(url, pathname) {
  if (pathname === '/alpha-complete' || pathname === '/alpha-complete/' || pathname === '/alpha-complete/index.html') {
    return path.resolve(root, 'releases/alpha-complete/index.html');
  }
  if (pathname === '/alpha-complete/trash-dice.html') {
    return path.resolve(root, 'releases/alpha-complete/trash-dice.html');
  }
  const lockedBuild = lockedBuilds[url.searchParams.get('v')];
  const lockedPath = lockedBuild && lockedBuild[pathname];
  if (lockedPath) return path.resolve(root, lockedPath);
  return path.resolve(root, pathname.replace(/^\/+/, ''));
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  const target = resolveTarget(url, pathname);
  if (!isInsideRoot(target)) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    res.end('forbidden');
    return;
  }
  fs.readFile(target, (error, buffer) => {
    if (error) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'content-type': types[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    res.end(buffer);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`serving ${root} on ${port}`);
});
