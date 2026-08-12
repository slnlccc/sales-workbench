const http = require('http');
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

const LOCAL_PORT = 3001;
const TUNNEL_HOST = 'loca.lt';
const TUNNEL_PORT = 443;

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:18080';
const agent = new HttpsProxyAgent(proxyUrl);

console.log('正在连接隧道服务器...');

https.get({
  hostname: TUNNEL_HOST,
  port: TUNNEL_PORT,
  path: '/',
  agent: agent
}, (res) => {
  console.log('隧道服务器响应:', res.statusCode);
  
  const tunnelReq = https.request({
    hostname: TUNNEL_HOST,
    port: TUNNEL_PORT,
    method: 'POST',
    path: '/',
    agent: agent,
    headers: {
      'Content-Type': 'application/json'
    }
  }, (tunnelRes) => {
    let data = '';
    tunnelRes.on('data', chunk => data += chunk);
    tunnelRes.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result.url) {
          console.log('========================================');
          console.log('  公网隧道已建立');
          console.log('========================================');
          console.log('公网访问地址:', result.url);
          console.log('本地端口: 3001');
          console.log('默认账号: admin / admin123');
          console.log('========================================');
        } else {
          console.error('隧道建立失败:', data);
        }
      } catch (e) {
        console.error('解析响应失败:', e.message, data);
      }
    });
  });
  
  tunnelReq.write(JSON.stringify({ port: LOCAL_PORT }));
  tunnelReq.end();
  
}).on('error', (err) => {
  console.error('连接隧道服务器失败:', err.message);
});
