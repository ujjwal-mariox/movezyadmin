import { useState, useMemo, useEffect } from "react";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export interface UsePaginationReturn<T> {
  currentPage: number;
  totalPages: number;
  paginatedData: T[];
  setCurrentPage: (page: number) => void;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  pageSize: PageSize;
  setPageSize: (size: PageSize) => void;
}

export function usePagination<T>(
  data: T[],
  initialPageSize: PageSize = 10,
): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<PageSize>(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  // Reset to page 1 when data length changes (e.g. filters applied)
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const setPageSize = (size: PageSize) => {
    setPageSizeState(size);
    setCurrentPage(1);
  };

  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, data.length);

  const paginatedData = useMemo(
    () => data.slice(startIndex, endIndex),
    [data, startIndex, endIndex],
  );

  return {
    currentPage: safePage,
    totalPages,
    paginatedData,
    setCurrentPage,
    totalItems: data.length,
    startIndex: data.length === 0 ? 0 : startIndex + 1,
    endIndex,
    pageSize,
    setPageSize,
  };
}
