import { useEffect, useState } from 'react';
import { apiRequest } from './api';

export default function useApiQuery(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [requestNumber, setRequestNumber] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });

    apiRequest(path, { signal: controller.signal })
      .then(data => setState({ data, error: null, loading: false }))
      .catch(error => {
        if (!controller.signal.aborted) {
          setState({ data: null, error, loading: false });
        }
      });

    return () => controller.abort();
  }, [path, requestNumber]);

  return { ...state, refetch: () => setRequestNumber(number => number + 1) };
}
