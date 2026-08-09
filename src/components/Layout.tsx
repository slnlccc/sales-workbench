import { useState, ReactNode, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { useMarketRadarStore } from '@/store/useMarketRadarStore';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const checkDailyUpdate = useMarketRadarStore((s) => s.checkDailyUpdate);
  const loadServerAnchorAndCheck = useMarketRadarStore((s) => s.loadServerAnchorAndCheck);

  // 全局级每日更新保障：每次进入Layout（登录后跳转、刷新）都触发一次
  // 市情雷达页面也有自己的hook，但手机用户先进入工作台/客户管理时，此全局也先预热更新一次
  useEffect(() => {
    // 1) 立即同步走一次本地判断（首屏无延迟）
    checkDailyUpdate();
    // 2) 并行拉取服务端权威北京时间锚点并校验（不阻塞UI；部署到Railway后尤其重要，避免手机时钟/时区错误）
    loadServerAnchorAndCheck();
  }, [checkDailyUpdate, loadServerAnchorAndCheck]);

  // 全局可见性/focus监听（不管在哪个Tab页，切回APP都触发）
  useEffect(() => {
    const check = () => {
      checkDailyUpdate();
      // 每次切回前台都重新向服务端确认一次北京时间（约500ms~1s，网络差时静默）
      loadServerAnchorAndCheck();
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', check);
    // 每小时全局校验一次（覆盖凌晨跨天用户不切换市情雷达Tab的场景）
    const hourly = window.setInterval(check, 60 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', check);
      window.clearInterval(hourly);
    };
  }, [checkDailyUpdate, loadServerAnchorAndCheck]);

  return (
    <div className="flex h-screen overflow-hidden bg-cream-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24">
          {children}
        </div>
      </main>
    </div>
  );
}
