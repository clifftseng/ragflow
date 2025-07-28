// 檔案路徑: ragflow/web/src/pages/km/forbidden/index.tsx
// 【【【這是一個全新的檔案】】】

import { Button, Result } from 'antd';
import { history } from 'umi';
import React from 'react';

const KmForbiddenPage: React.FC = () => (
  <div style={{ background: 'white', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Result
      status="403"
      title="403"
      subTitle="Sorry, you are not authorized to access this page. The link may be invalid or expired."
      extra={
        <Button type="primary" onClick={() => history.push('/login')}>
          Back to Login
        </Button>
      }
    />
  </div>
);

export default KmForbiddenPage;