import { useCallback, useEffect, useState } from "react";
import { api } from "@/utils/api";
import { getErrorMessage } from "@/utils/request";

export default function useResourceList(url, params) {
  const [state, setState] = useState({ rows: [], pagination: null, loading: true, error: null });
  const key = JSON.stringify(params);

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data } = await api.get(url, { params: JSON.parse(key) });
      setState({ rows: data.data, pagination: data.pagination, loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: getErrorMessage(e) }));
    }
  }, [url, key]);

  useEffect(() => { refetch(); }, [refetch]);
  return { ...state, refetch };
}
