'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps, memo } from 'react';
import { Streamdown } from 'streamdown';
import { processMaddeLinks } from '@/lib/madde-links';

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, children, ...props }: ResponseProps) => {
    // Process the content to convert Maddə references to links
    const processedContent = typeof children === 'string' 
      ? processMaddeLinks(children)
      : children;

    return (
      <Streamdown
        className={cn(
          'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto',
          // Add styling for Maddə links
          '[&_a[href*="e-qanun.az"]]:text-blue-600 [&_a[href*="e-qanun.az"]]:underline [&_a[href*="e-qanun.az"]]:underline-offset-2 hover:[&_a[href*="e-qanun.az"]]:text-blue-800',
          '[&_a[href*="e-qanun.az"]]:dark:text-blue-400 hover:[&_a[href*="e-qanun.az"]]:dark:text-blue-300',
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