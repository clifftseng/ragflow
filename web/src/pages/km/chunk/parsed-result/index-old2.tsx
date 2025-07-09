// 檔案: web/src/pages/km/chunk/parsed-result/index.tsx
// 【【【最終偵錯版】】】

import { useChunk } from '../context';

export default function ParsedResultPage() {
  // 從 Context 獲取狀態
  const { data, loading, isError, error } = useChunk();

  // 在子元件中也打印日誌，確認資料傳遞成功
  console.log(`[CHILD: ParsedResultPage] Received from context. Loading: ${loading}, isError: ${isError}, Data:`, data);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
      <h2 style={{ color: 'navy' }}>Chunk Page - Debug View</h2>
      <hr />
      
      <h3>Data Fetching Status:</h3>
      <p style={{ color: loading ? 'blue' : 'black' }}>
        <b>Loading:</b> {loading.toString()}
      </p>
      <p style={{ color: isError ? 'red' : 'black' }}>
        <b>Error Occurred:</b> {isError.toString()}
      </p>
      
      <h3>Error Message:</h3>
      <div style={{ padding: '10px', border: '1px solid #ccc', backgroundColor: '#f5f5f5' }}>
        {error ? (error as any).message : 'No error message.'}
      </div>

      <h3>Received Data:</h3>
      <div style={{ padding: '10px', border: '1px solid #ccc', backgroundColor: '#f5f5f5' }}>
        {JSON.stringify(data, null, 2)}
      </div>
    </div>
  );
}