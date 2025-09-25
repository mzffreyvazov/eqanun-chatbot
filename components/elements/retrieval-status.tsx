'use client';

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { SearchIcon, ChevronDownIcon, FileTextIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { createContext, memo, useContext, useEffect, useState } from 'react';

type RetrievalStatusContextValue = {
  isRetrieving: boolean;
  isCompiling: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  foundDocuments: number;
};

const RetrievalStatusContext = createContext<RetrievalStatusContextValue | null>(null);

const useRetrievalStatus = () => {
  const context = useContext(RetrievalStatusContext);
  if (!context) {
    throw new Error('RetrievalStatus components must be used within RetrievalStatus');
  }
  return context;
};

export type RetrievalStatusProps = ComponentProps<typeof Collapsible> & {
  isRetrieving?: boolean;
  isCompiling?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  foundDocuments?: number;
};

const AUTO_CLOSE_DELAY = 2000; // Longer delay for retrieval status

export const RetrievalStatus = memo(
  ({
    className,
    isRetrieving = false,
    isCompiling = false,
    open,
    defaultOpen = true,
    onOpenChange,
    foundDocuments = 0,
    children,
    ...props
  }: RetrievalStatusProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });

    const [hasAutoClosedRef, setHasAutoClosedRef] = useState(false);

    // Auto-open when retrieval starts, auto-close when both retrieval and compilation end
    useEffect(() => {
      if (isRetrieving || isCompiling) {
        setIsOpen(true);
        setHasAutoClosedRef(false);
      } else if (defaultOpen && !isRetrieving && !isCompiling && isOpen && !hasAutoClosedRef) {
        // Add a delay before closing to allow user to see the completion
        const timer = setTimeout(() => {
          setIsOpen(false);
          setHasAutoClosedRef(true);
        }, AUTO_CLOSE_DELAY);

        return () => clearTimeout(timer);
      }
    }, [isRetrieving, isCompiling, isOpen, defaultOpen, setIsOpen, hasAutoClosedRef]);

    const handleOpenChange = (newOpen: boolean) => {
      setIsOpen(newOpen);
    };

    return (
      <RetrievalStatusContext.Provider
        value={{ isRetrieving, isCompiling, isOpen, setIsOpen, foundDocuments }}
      >
        <Collapsible
          className={cn('not-prose', className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </RetrievalStatusContext.Provider>
    );
  },
);

export type RetrievalStatusTriggerProps = ComponentProps<
  typeof CollapsibleTrigger
> & {
  summaryText?: string;
  showChevron?: boolean;
};

export const RetrievalStatusTrigger = memo(
  ({
    className,
    children,
    summaryText,
    showChevron = true,
    ...props
  }: RetrievalStatusTriggerProps) => {
    const { isRetrieving, isCompiling, isOpen, foundDocuments } = useRetrievalStatus();

    const getStatusText = () => {
      if (isRetrieving) {
        return "Əlaqəli sənədlər axtarılır...";
      }
      if (isCompiling) {
        return "Cavabınız hazırlanır...";
      }
      if (foundDocuments > 0) {
        return `${foundDocuments} əlaqəli sənəd tapıldı`;
      }
      return "Sənəd axtarışı tamamlandı";
    };

    const getIcon = () => {
      if (isRetrieving) {
        return <SearchIcon className="size-4 animate-pulse" />;
      }
      if (isCompiling) {
        return <FileTextIcon className="size-4 animate-pulse" />;
      }
      return <SearchIcon className="size-4" />;
    };

    return (
      <CollapsibleTrigger
        className={cn(
          'flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground',
          className,
        )}
        {...props}
      >
        {children ?? (
          <>
            {getIcon()}
            <p>{summaryText ?? getStatusText()}</p>
            {showChevron ? (
              <ChevronDownIcon
                className={cn(
                  'size-3 text-muted-foreground transition-transform',
                  isOpen ? 'rotate-180' : 'rotate-0',
                )}
              />
            ) : null}
          </>
        )}
      </CollapsibleTrigger>
    );
  },
);

export type RetrievalStatusContentProps = ComponentProps<
  typeof CollapsibleContent
> & {
  children: React.ReactNode;
};

export const RetrievalStatusContent = memo(
  ({ className, children, ...props }: RetrievalStatusContentProps) => (
    <CollapsibleContent
      className={cn(
        'mt-2 text-muted-foreground text-xs',
        'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in',
        className,
      )}
      {...props}
    >
      <div className="grid gap-2">
        {children}
      </div>
    </CollapsibleContent>
  ),
);

RetrievalStatus.displayName = 'RetrievalStatus';
RetrievalStatusTrigger.displayName = 'RetrievalStatusTrigger';
RetrievalStatusContent.displayName = 'RetrievalStatusContent';