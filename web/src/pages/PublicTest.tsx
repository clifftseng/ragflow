// 檔案路徑: web/src/pages/PublicTest.tsx
import React from 'react';

const PublicTestPage: React.FC = () => {
  return (
    <div style={{ padding: '50px', textAlign: 'center', fontSize: '24px', color: 'black', backgroundColor: 'white' }}>
      <h1>Hello, Public World!</h1>
      <p>If you can see this, the basic public route is working.</p>
    </div>
  );
};

export default PublicTestPage;