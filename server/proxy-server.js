const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({});
const server = http.createServer((req, res) => {
  proxy.web(req, res, {
    target: 'http://localhost:3001',
    changeOrigin: true
  });
});

server.on('error', (err) => {
  console.error('代理服务器错误:', err);
});

const PORT = 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`代理服务器运行在 0.0.0.0:${PORT}`);
  console.log(`访问地址: http://101.126.128.7:${PORT}`);
});
