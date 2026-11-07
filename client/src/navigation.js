import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export function useHistory() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push: to => navigate(to),
      replace: to => navigate(to, { replace: true }),
    }),
    [navigate]
  );
}
