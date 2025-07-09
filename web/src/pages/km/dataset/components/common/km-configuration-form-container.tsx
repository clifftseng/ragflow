import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export function KmMainContainer({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-8">{children}</div>;
}

export function KmConfigurationFormContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-8 rounded-lg border p-4', className)}>
      {children}
    </div>
  );
}