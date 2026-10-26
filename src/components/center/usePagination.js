import { useState } from 'react';

export const pageSizes = [10, 20, 50];
const preferenceKey = 'physioguide-center-page-size';

export default function usePagination(total) {
  const [page, setPage] = useState(1);
  const [pageSize, setSize] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(preferenceKey));
      return pageSizes.includes(saved) ? saved : 10;
    } catch { return 10; }
  });
  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
  if (currentPage !== page) setPage(currentPage);

  function setPageSize(value) {
    const next = Number(value);
    if (!pageSizes.includes(next)) return;
    setSize(next);
    setPage(1);
    try { localStorage.setItem(preferenceKey, String(next)); } catch { /* The selector still works without storage. */ }
  }
  return { page: currentPage, setPage, pageSize, setPageSize, start: (currentPage - 1) * pageSize };
}
