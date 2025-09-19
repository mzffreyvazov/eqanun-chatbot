'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps, memo } from 'react';
import { Streamdown } from 'streamdown';
import { processMaddeLinks } from '@/lib/madde-links';

type ResponseProps = ComponentProps<typeof Streamdown> & {
  retrievalData?: string | any; // Add this prop to pass retrieval data
};

export const Response = memo(
  ({ className, children, retrievalData, ...props }: ResponseProps) => {
    // Process the content to convert Maddə references to links
    const processedContent = typeof children === 'string' 
      ? processMaddeLinks(children, retrievalData)
      : children;

    return (
      <Streamdown
        className={cn(
          'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto',
          // Pill styling for Maddə links (e-qanun.az)
          '[&_a[href*="e-qanun.az"]]:inline-flex [&_a[href*="e-qanun.az"]]:items-center [&_a[href*="e-qanun.az"]]:whitespace-nowrap',
          '[&_a[href*="e-qanun.az"]]:rounded-full [&_a[href*="e-qanun.az"]]:px-1 [&_a[href*="e-qanun.az"]]:py-px [&_a[href*="e-qanun.az"]]:text-[10px]',
          '[&_a[href*="e-qanun.az"]]:no-underline [&_a[href*="e-qanun.az"]]:transition-colors',
          '[&_a[href*="e-qanun.az"]]:bg-blue-50 [&_a[href*="e-qanun.az"]]:text-blue-700 [&_a[href*="e-qanun.az"]]:border [&_a[href*="e-qanun.az"]]:border-blue-200',
          'hover:[&_a[href*="e-qanun.az"]]:bg-blue-100',
          '[&_a[href*="e-qanun.az"]]:focus-visible:outline-none [&_a[href*="e-qanun.az"]]:focus-visible:ring-2 [&_a[href*="e-qanun.az"]]:focus-visible:ring-blue-300',
          // Dark mode variants
          '[&_a[href*="e-qanun.az"]]:dark:bg-blue-500/10 [&_a[href*="e-qanun.az"]]:dark:text-blue-300 [&_a[href*="e-qanun.az"]]:dark:border-blue-400/30',
          'dark:hover:[&_a[href*="e-qanun.az"]]:bg-blue-500/20 dark:[&_a[href*="e-qanun.az"]]:focus-visible:ring-blue-400/40',
          className,
        )}
        components={{
          // Custom component for links to add target="_blank" to e-qanun.az links
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target={href?.includes('e-qanun.az') ? '_blank' : undefined}
              rel={href?.includes('e-qanun.az') ? 'noopener noreferrer' : undefined}
              {...props}
            >
              {children}
            </a>
          ),
        }}
        {...props}
      >
        {processedContent}
      </Streamdown>
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = 'Response';