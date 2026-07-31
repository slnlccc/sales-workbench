import localtunnel from 'localtunnel';

(async () => {
  const tunnel = await localtunnel({ port: 3001 });
  console.log('公网访问地址:', tunnel.url);
  console.log('本地端口: 3001');
  console.log('按 Ctrl+C 停止');
  
  tunnel.on('close', () => {
    console.log('隧道已关闭');
  });
  
  tunnel.on('error', (err) => {
    console.error('隧道错误:', err.message);
  });
})();
