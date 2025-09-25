import { PreviewMessage, ThinkingMessage } from './message';
import { Greeting } from './greeting';
import { memo, useEffect } from 'react';
import type { Vote } from '@/lib/db/schema';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { useMessages } from '@/hooks/use-messages';
import type { ChatMessage, RetrievalResponse } from '@/lib/types';
import { useDataStream } from './data-stream-provider';
import { Conversation, ConversationContent } from './elements/conversation';
import { ArrowDownIcon } from 'lucide-react';
import { MessageRetrievalStatus } from './message-retrieval-status';
import { SparklesIcon } from './icons';

interface MessagesProps {
  chatId: string;
  status: UseChatHelpers<ChatMessage>['status'];
  votes: Array<Vote> | undefined;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  selectedModelId: string;
  retrievalData?: RetrievalResponse;
  isRetrieving?: boolean;
  isCompiling?: boolean;
  foundDocuments?: number;
}

function PureMessages({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  regenerate,
  isReadonly,
  isArtifactVisible,
  selectedModelId,
  retrievalData,
  isRetrieving = false,
  isCompiling = false,
  foundDocuments = 0,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    isAtBottom,
    scrollToBottom,
    hasSentMessage,
  } = useMessages({
    chatId,
    status,
  });

  useDataStream();

  useEffect(() => {
    if (status === 'submitted') {
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth',
          });
        }
      });
    }
  }, [status, messagesContainerRef]);

  const retrievalChunks = retrievalData?.chunks ?? [];
  const retrievalSources = Array.from(
    new Set(
      retrievalChunks
        .map((chunk) =>
          chunk.metadata.display_source_name ??
          chunk.metadata.document_title ??
          chunk.metadata.document_filename,
        )
        .filter((value): value is string => Boolean(value)),
    ),
  ).slice(0, 3);

  const latestMessage = messages.at(-1);
  const isAwaitingAssistant = !latestMessage || latestMessage.role === 'user';
  const shouldShowGlobalStatus =
    isAwaitingAssistant &&
    (isRetrieving || isCompiling || foundDocuments > 0 || retrievalSources.length > 0);

  return (
    <div
      ref={messagesContainerRef}
      className="overscroll-behavior-contain -webkit-overflow-scrolling-touch flex-1 touch-pan-y overflow-y-scroll"
      style={{ overflowAnchor: 'none' }}
    >
      <Conversation className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4 md:gap-6">
        <ConversationContent className="flex flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
          {messages.length === 0 && <Greeting />}

          {messages.map((message, index) => {
            const isLatestMessage = index === messages.length - 1;
            return (
              <PreviewMessage
                key={message.id}
                chatId={chatId}
                message={message}
                isLoading={
                  status === 'streaming' && messages.length - 1 === index
                }
                vote={
                  votes
                    ? votes.find((vote) => vote.messageId === message.id)
                    : undefined
                }
                setMessages={setMessages}
                regenerate={regenerate}
                isReadonly={isReadonly}
                requiresScrollPadding={
                  hasSentMessage && isLatestMessage
                }
                isArtifactVisible={isArtifactVisible}
                retrievalData={retrievalData}
                isLatestAssistant={
                  isLatestMessage && message.role === 'assistant'
                }
                isRetrieving={isRetrieving}
                isCompiling={isCompiling}
                foundDocuments={foundDocuments}
              />
            );
          })}

          {shouldShowGlobalStatus && (
            <div className="flex items-start gap-2 md:gap-3">
              <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
                <SparklesIcon size={14} />
              </div>

              <div className="flex flex-col gap-2 md:gap-4">
                <MessageRetrievalStatus
                  isRetrieving={isRetrieving}
                  isCompiling={isCompiling}
                  foundDocuments={foundDocuments}
                >
                  {retrievalSources.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-muted-foreground/80 text-xs">
                        İstinad edilən mənbələr:
                      </p>
                      <ul className="list-disc space-y-1 pl-5 text-muted-foreground text-xs">
                        {retrievalSources.map((source) => (
                          <li key={source}>{source}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </MessageRetrievalStatus>
              </div>
            </div>
          )}

          {status === 'submitted' &&
            messages.length > 0 &&
            messages[messages.length - 1].role === 'user' &&
            selectedModelId !== 'chat-model-reasoning' &&
            !shouldShowGlobalStatus && <ThinkingMessage />}

          <div
            ref={messagesEndRef}
            className="min-h-[24px] min-w-[24px] shrink-0"
          />
        </ConversationContent>
      </Conversation>

      {!isAtBottom && (
        <button
          className="-translate-x-1/2 absolute bottom-40 left-1/2 z-10 rounded-full border bg-background p-2 shadow-lg transition-colors hover:bg-muted"
          onClick={() => scrollToBottom('smooth')}
          type="button"
          aria-label="Scroll to bottom"
        >
          <ArrowDownIcon className="size-4" />
        </button>
      )}
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;

  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (prevProps.isRetrieving !== nextProps.isRetrieving) return false;
  if (prevProps.isCompiling !== nextProps.isCompiling) return false;
  if (prevProps.foundDocuments !== nextProps.foundDocuments) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;
  if (!equal(prevProps.retrievalData, nextProps.retrievalData)) return false;

  return false;
});
