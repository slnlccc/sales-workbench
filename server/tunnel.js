const localtunnel = require('localtunnel');

(async () => {
  console.log('正在建立公网隧道...');
  console.log('本地端口: 3001');

  try {
    const tunnel = await localtunnel({
      port: 3001,
      subdomain: 'sales-wb-' + Date.now().toString(36).slice(-6)
    });

    console.log('\n========================================');
    console.log('  公网访问地址（复制到浏览器打开）:');
    console.log('  ' + tunnel.url);
    console.log('========================================\n');
    console.log('按 Ctrl+C 停止隧道');

    tunnel.on('close', () => {
      console.log('隧道已关闭');
    });

    tunnel.on('error', (err) => {
      console.error('隧道错误:', err.message);
    });

  } catch (err) {
    console.error('建立隧道失败:', err.message);
    process.exit(1);
  }
})();
