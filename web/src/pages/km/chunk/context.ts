// 檔案: web/src/pages/km/chunk/context.ts
// 【【【請覆蓋此檔案】】】
import { createContext, useContext } from 'react';

// 建立 Context 物件
export const ChunkContext = createContext<any>({});

// 【【【核心修正】】】: 將 Context 的 Provider 直接匯出，並命名為 ChunkProvider
export const ChunkProvider = ChunkContext.Provider;

// 匯出 useChunk 這個 Hook，方便子元件使用
export const useChunk = () => {
  return useContext(ChunkContext);
};