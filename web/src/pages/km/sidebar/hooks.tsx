import { useCallback } from 'react';
import { useNavigate, useParams } from 'umi';

export const useHandleMenuClick = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const handleMenuClick = useCallback(
    (key: string) => () => {
      if (!id) return;
      navigate(`/km/${id}${key}`);
    },
    [id, navigate],
  );

  return { handleMenuClick };
};
