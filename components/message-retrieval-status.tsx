'use client';

import {
  RetrievalStatus,
  RetrievalStatusTrigger,
  RetrievalStatusContent,
} from './elements/retrieval-status';

interface MessageRetrievalStatusProps {
  isRetrieving: boolean;
  isCompiling: boolean;
  foundDocuments?: number;
  children?: React.ReactNode;
}

export function MessageRetrievalStatus({
  isRetrieving,
  isCompiling,
  foundDocuments = 0,
  children,
}: MessageRetrievalStatusProps) {
  // Only show the component if we're actively retrieving/compiling or if we have content to show
  const shouldShow =
    isRetrieving || isCompiling || foundDocuments > 0 || Boolean(children);

  if (!shouldShow) {
    return null;
  }

  const getStatusContent = () => {
    if (isRetrieving) {
      return "Eqanun verilənlər bazasında əlaqəli sənədlər axtarılır...";
    }
    if (isCompiling) {
      return "Tapılan məlumatlara əsasən cavabınız hazırlanır...";
    }
    if (foundDocuments > 0) {
      return `${foundDocuments} əlaqəli sənəd tapıldı və cavaba daxil edilir`;
    }
    return null;
  };

  const statusContent = getStatusContent();

  return (
    <RetrievalStatus
      isRetrieving={isRetrieving}
      isCompiling={isCompiling}
      foundDocuments={foundDocuments}
      defaultOpen={true}
      data-testid="message-retrieval-status"
    >
      <RetrievalStatusTrigger />
      {(statusContent || children) && (
        <RetrievalStatusContent>
          {statusContent && <p className="text-muted-foreground">{statusContent}</p>}
          {children}
        </RetrievalStatusContent>
      )}
    </RetrievalStatus>
  );
}