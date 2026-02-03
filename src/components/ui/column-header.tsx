'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ColumnHeaderProps {
  column: string;
  title: string;
  className?: string;
}

export function ColumnHeader({ column, title, className }: ColumnHeaderProps) {
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort');
  const currentOrder = searchParams.get('order');

  const isSorted = currentSort === column;
  const newOrder = isSorted && currentOrder === 'asc' ? 'desc' : 'asc';

  // Create new URLSearchParams with updated sort/order
  const params = new URLSearchParams(searchParams.toString());
  params.set('sort', column);
  params.set('order', newOrder);

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8 data-[state=open]:bg-accent", className)}
      asChild
    >
      <Link href={`?${params.toString()}`}>
        <span>{title}</span>
        {isSorted ? (
          currentOrder === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUp className="ml-2 h-4 w-4" />
          )
        ) : (
          <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
        )}
      </Link>
    </Button>
  );
}
