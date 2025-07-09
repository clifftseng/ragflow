import { Routes } from '@/routes';
import { useCallback } from 'react';
import { useNavigate, useParams } from 'umi';

export const useHandleMenuClick = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const handleMenuClick = useCallback(
    (key: string) => () => { // 將 key 的類型從 Routes 改為 string
      // 直接導航到相對路徑，Umi 的 navigate 函式會自動處理
      navigate(key); 
    },
    [navigate], // id 不再需要作為依賴，因為 navigate 會自動保留
  );

  return { handleMenuClick };
};
