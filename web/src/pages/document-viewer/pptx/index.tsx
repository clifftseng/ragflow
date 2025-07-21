// 檔案位置: ragflow/web/src/pages/document-viewer/pptx/index.tsx
// 【【【最終正確版本 V4.0】】】

import React, { useEffect, useRef, useState } from 'react';
import { init as initPptxViewer } from 'pptx-preview';
import { Spin, Alert } from 'antd';
import styles from './index.less';

interface IProps {
  filePath: string;
}

const PptxViewer = ({ filePath }: IProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // 使用 Ref 來儲存 viewer 實例，使其在元件重繪時保持不變
  const viewerRef = useRef<any>(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    const renderPptx = async () => {
      if (!containerRef.current) {
        setErrorInfo("渲染目標容器 (div) 未能成功創建。");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorInfo(null);
      // 清空上一次的內容，防止重複
      containerRef.current.innerHTML = ''; 

      try {
        // 僅在第一次渲染時初始化 viewer
        if (!viewerRef.current) {
          const containerWidth = containerRef.current.offsetWidth || 960;
          const options = {
            width: containerWidth,
            height: containerWidth * (9 / 16), // 保持 16:9 的長寬比
          };
          viewerRef.current = initPptxViewer(containerRef.current, options);
          console.log("PPTX-Preview viewer initialized.");
        }
        
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`獲取文件失敗: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        if (arrayBuffer.byteLength === 0) {
          throw new Error("獲取到的文件為空 (0 bytes)。");
        }

        // 呼叫實例的 preview 方法來渲染
        await viewerRef.current.preview(arrayBuffer);
        console.log("PPTX rendered successfully with pptx-preview.");

      } catch (error: any) {
        console.error("PPTX render failed with pptx-preview:", error);
        setErrorInfo(error.message || '使用 pptx-preview 發生未知渲染錯誤。');
      } finally {
        setIsLoading(false);
      }
    };

    if (filePath) {
      renderPptx();
    }
  }, [filePath]);

  return (
    <div className={styles.pptxContainer}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <Spin size="large" />
        </div>
      )}
      {errorInfo && (
        <Alert
          message="渲染錯誤"
          description={errorInfo}
          type="error"
          showIcon
        />
      )}
      {/* 渲染目標容器 */}
      <div ref={containerRef}></div>
    </div>
  );
};

export default PptxViewer;
