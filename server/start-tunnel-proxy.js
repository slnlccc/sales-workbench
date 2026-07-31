const localtunnel = require('localtunnel');
const { HttpsProxyAgent } = require('https-proxy-agent');

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
console.log('使用代理:', proxyUrl);

const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

(async () => {
  try {
    const tunnel = await localtunnel({ 
      port: 3001,
      agent: agent
    });
    console.log('========================================');
    console.log('  公网隧道已建立');
    console.log('========================================');
    console.log('公网访问地址:', tunnel.url);
    console.log('本地端口: 3001');
    console.log('默认账号: admin / admin123');
    console.log('========================================');
    
    tunnel.on('close', () => {
      console.log('隧道已关闭');
    });
    
    tunnel.on('error', (err) => {
      console.error('隧道错误:', err.message);
    });
  } catch (err) {
    console.error('建立隧道失败:', err.message);
    console.error(err.stack);
  }
})();
