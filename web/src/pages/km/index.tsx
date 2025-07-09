// 檔案路徑: web/src/pages/km/index.tsx
// 【【【釜底抽薪的最終修正版】】】

import { Outlet } from 'umi';
import { SideBar } from './sidebar';

export default function KmLayout() {
  // 我們不再手動添加 ThemeProvider，因為 app.tsx 中已有一個全域的。
  // 我們只專注於提供一個正確的 HTML 結構，
  // 並為根容器加上 bg-background 和 text-foreground 這兩個 class，
  // 讓它可以從全域主題中繼承正確的背景和文字顏色。
  return (
    <div className="flex flex-1 h-screen bg-background text-foreground">
      <SideBar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}