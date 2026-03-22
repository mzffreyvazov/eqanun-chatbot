'use client';

import type { LanguageModelUsage } from 'ai';
import { breakdownTokens, estimateCost, normalizeUsage } from 'tokenlens';
import { useEffect, useState, type ComponentProps } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export type ContextProps = ComponentProps<'button'> & {
  maxTokens: number;
  usedTokens: number;
  usage?: LanguageModelUsage | undefined;
  modelId?: string;
};

const THOUSAND = 1000;
const MILLION = 1_000_000;
const BILLION = 1_000_000_000;
const PERCENT_MAX = 100;

const ICON_VIEWBOX = 24;
const ICON_CENTER = 12;
const ICON_RADIUS = 10;
const ICON_STROKE_WIDTH = 2;

const formatTokens = (tokens?: number) => {
  if (tokens === undefined || !Number.isFinite(tokens)) {
    return;
  }

  const abs = Math.abs(tokens);

  if (abs < THOUSAND) {
    return `${tokens}`;
  }

  if (abs < MILLION) {
    return `${(tokens / THOUSAND).toFixed(1)}K`;
  }

  if (abs < BILLION) {
    return `${(tokens / MILLION).toFixed(1)}M`;
  }

  return `${(tokens / BILLION).toFixed(1)}B`;
};

const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) {
    return '0%';
  }

  const rounded = Math.round(value * 10) / 10;

  return Number.isInteger(rounded)
    ? `${Math.trunc(rounded)}%`
    : `${rounded.toFixed(1)}%`;
};

const formatUSDFixed = (value?: number, decimals = 5) => {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined;
  }

  return `$${Number(value).toFixed(decimals)}`;
};

type ContextIconProps = {
  percent: number;
};

export const ContextIcon = ({ percent }: ContextIconProps) => {
  const circumference = 2 * Math.PI * ICON_RADIUS;
  const dashOffset = circumference * (1 - percent / PERCENT_MAX);

  return (
    <svg
      aria-label={`${formatPercent(percent)} of model context used`}
      height="28"
      role="img"
      style={{ color: 'currentcolor' }}
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      width="28"
    >
      <circle
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        fill="none"
        opacity="0.25"
        r={ICON_RADIUS}
        stroke="currentColor"
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <circle
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        fill="none"
        opacity="0.7"
        r={ICON_RADIUS}
        stroke="currentColor"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        strokeWidth={ICON_STROKE_WIDTH}
        transform={`rotate(-90 ${ICON_CENTER} ${ICON_CENTER})`}
      />
    </svg>
  );
};

function TokensWithCost({
  tokens,
  costText,
}: {
  tokens?: number;
  costText?: string;
}) {
  return (
    <span>
      {tokens === undefined ? '--' : formatTokens(tokens)}
      {costText ? (
        <span className="ml-2 text-muted-foreground">- {costText}</span>
      ) : null}
    </span>
  );
}

function InfoRow({
  label,
  tokens,
  costText,
}: {
  label: string;
  tokens?: number;
  costText?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <TokensWithCost tokens={tokens} costText={costText} />
    </div>
  );
}

export const Context = ({
  className,
  maxTokens,
  usedTokens,
  usage,
  modelId,
  ...props
}: ContextProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const safeMax = Math.max(0, Number.isFinite(maxTokens) ? maxTokens : 0);
  const safeUsed = Math.min(
    Math.max(0, Number.isFinite(usedTokens) ? usedTokens : 0),
    safeMax,
  );

  const usedPercent =
    safeMax > 0
      ? Math.min(PERCENT_MAX, Math.max(0, (safeUsed / safeMax) * PERCENT_MAX))
      : 0;

  const displayPct = formatPercent(Math.round(usedPercent * 10) / 10);
  const used = formatTokens(safeUsed);
  const total = formatTokens(safeMax);

  const normalizedUsage = normalizeUsage(usage);
  const usageBreakdown = breakdownTokens(usage);

  const hasUsage =
    !!usage &&
    ((normalizedUsage.input ?? 0) > 0 ||
      (normalizedUsage.output ?? 0) > 0 ||
      (usageBreakdown.cacheReads ?? 0) > 0 ||
      (usageBreakdown.cacheWrites ?? 0) > 0 ||
      (usageBreakdown.reasoningTokens ?? 0) > 0);

  const inputTokens = normalizedUsage.input;
  const outputTokens = normalizedUsage.output;
  const cacheReadTokens = usageBreakdown.cacheReads ?? 0;
  const cacheWriteTokens = usageBreakdown.cacheWrites ?? 0;
  const reasoningTokens = usageBreakdown.reasoningTokens ?? 0;

  const inputCostText = modelId
    ? formatUSDFixed(
        estimateCost({
          modelId,
          usage: { input: inputTokens ?? 0, output: 0 },
        }).inputUSD,
      )
    : undefined;

  const outputCostText = modelId
    ? formatUSDFixed(
        estimateCost({
          modelId,
          usage: { input: 0, output: outputTokens ?? 0 },
        }).outputUSD,
      )
    : undefined;

  const cacheReadsCostText =
    modelId && cacheReadTokens > 0
      ? formatUSDFixed(
          estimateCost({
            modelId,
            usage: { cacheReads: cacheReadTokens } as never,
          }).totalUSD,
        )
      : undefined;

  const cacheWritesCostText =
    modelId && cacheWriteTokens > 0
      ? formatUSDFixed(
          estimateCost({
            modelId,
            usage: { cacheWrites: cacheWriteTokens } as never,
          }).totalUSD,
        )
      : undefined;

  const reasoningCostText =
    modelId && reasoningTokens > 0
      ? (() => {
          const estimate = estimateCost({
            modelId,
            usage: { reasoningTokens },
          }).totalUSD;

          return estimate && Number.isFinite(estimate) && estimate > 0
            ? formatUSDFixed(estimate)
            : '--';
        })()
      : undefined;

  const totalCostText = modelId
    ? formatUSDFixed(
        estimateCost({
          modelId,
          usage: { input: inputTokens ?? 0, output: outputTokens ?? 0 },
        }).totalUSD,
      )
    : undefined;

  const trigger = (
    <button
      className={cn(
        'inline-flex select-none items-center gap-1 rounded-md text-sm',
        'cursor-pointer bg-background text-foreground',
        className,
      )}
      type="button"
      {...props}
    >
      <span className="hidden font-medium text-muted-foreground">
        {displayPct}
      </span>
      <ContextIcon percent={usedPercent} />
    </button>
  );

  if (!isMounted) {
    return trigger;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-fit p-3">
        <div className="min-w-[240px] space-y-2">
          <div className="flex items-start justify-between text-sm">
            <span>{displayPct}</span>
            <span className="text-muted-foreground">
              {used} / {total} tokens
            </span>
          </div>

          <div className="space-y-2">
            <Progress className="h-2 bg-muted" value={usedPercent} />
          </div>

          <div className="mt-1 space-y-1">
            {hasUsage && cacheReadTokens > 0 ? (
              <InfoRow
                label="Cache Hits"
                tokens={cacheReadTokens}
                costText={cacheReadsCostText}
              />
            ) : null}

            {hasUsage && cacheWriteTokens > 0 ? (
              <InfoRow
                label="Cache Writes"
                tokens={cacheWriteTokens}
                costText={cacheWritesCostText}
              />
            ) : null}

            <InfoRow
              label="Input"
              tokens={inputTokens}
              costText={inputCostText}
            />
            <InfoRow
              label="Output"
              tokens={outputTokens}
              costText={outputCostText}
            />
            <InfoRow
              label="Reasoning"
              tokens={reasoningTokens > 0 ? reasoningTokens : undefined}
              costText={reasoningCostText}
            />

            {totalCostText ? (
              <>
                <Separator className="mt-1" />
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-muted-foreground">Total cost</span>
                  <span>{totalCostText}</span>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
