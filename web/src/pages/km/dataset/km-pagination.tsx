// 檔案路徑: web/src/pages/km/dataset/km-pagination.tsx
// 【【【最終運行時修正版】】】

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IPagination } from '@/interfaces/common';

interface IKmPaginationProps extends IPagination {
  onChange?: (pagination: { current: number; pageSize: number }) => void;
  className?: string;
}

export function KmPagination({
  current,
  pageSize,
  total,
  onChange,
  className,
}: IKmPaginationProps) {
  const totalPage = Math.ceil(total / pageSize);

  if (total === 0) {
    return null;
  }

  const handlePageSizeChange = (size: string) => {
    onChange?.({ current: 1, pageSize: Number(size) });
  };

  const handlePageChange = (page: number) => {
    // 確保頁碼在有效範圍內
    if (page < 1 || page > totalPage) return;
    onChange?.({ current: page, pageSize });
  };

  return (
    <div className={cn('flex items-center space-x-6 lg:space-x-8', className)}>
      <div className="flex items-center space-x-2">
        <p className="text-sm font-medium">Total {total}</p>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => handlePageChange(1)}
          disabled={current === 1}
        >
          <span className="sr-only">Go to first page</span>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => handlePageChange(current - 1)}
          disabled={current === 1}
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center justify-center text-sm font-medium">
          Page {current} of {totalPage}
        </div>
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => handlePageChange(current + 1)}
          disabled={current >= totalPage}
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => handlePageChange(totalPage)}
          disabled={current >= totalPage}
        >
          <span className="sr-only">Go to last page</span>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex w-[120px] items-center space-x-2">
        <Select value={`${pageSize}`} onValueChange={handlePageSizeChange}>
          {/* 【【【關鍵修改處】】】
            我們不再使用 asChild 和嵌套的 Button，而是採用 shadcn/ui 的標準用法。
            SelectTrigger 本身就是一個按鈕，可以直接設定樣式。
            SelectValue 用於顯示當前選定的值。
            這種寫法更簡潔、更穩定，並能避免 "single child" 錯誤。
          */}
          <SelectTrigger className="h-8 w-full" variant="outline">
            <SelectValue placeholder={`${pageSize} / page`} />
          </SelectTrigger>
          <SelectContent side="top">
            {[10, 20, 50, 100].map((size) => (
              <SelectItem key={size} value={`${size}`}>
                {size} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};