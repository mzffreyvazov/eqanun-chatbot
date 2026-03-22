'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';

import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { type VisibilityType, VisibilitySelector } from './visibility-selector';
import type { Session } from 'next-auth';

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
  session,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      <Button
        variant="outline"
        className="order-2 ml-auto h-8 px-2 md:hidden"
        onClick={() => {
          router.push('/');
          router.refresh();
        }}
      >
        <PlusIcon />
        <span className="sr-only">New Chat</span>
      </Button>

      {!open && (
        <Button
          variant="outline"
          className="order-2 ml-auto hidden h-fit px-2 md:order-1 md:ml-0 md:flex"
          onClick={() => {
            router.push('/');
            router.refresh();
          }}
        >
          <PlusIcon />
          <span>New Chat</span>
        </Button>
      )}

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-2"
        />
      )}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
