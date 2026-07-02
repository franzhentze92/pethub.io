export const VIEWPORT_PAD = 12;
export const BOTTOM_NAV_RESERVE = 72;

export type TooltipLayout =
  | { mode: 'center' }
  | { mode: 'anchored'; top: number; left: number; width: number }
  | { mode: 'bottom-sheet'; left: number; right: number; bottom: number };

export function getSafeBottom(): number {
  return BOTTOM_NAV_RESERVE + VIEWPORT_PAD;
}

export function computeTooltipLayout(
  targetRect: DOMRect | null,
  preferredPlacement: 'top' | 'bottom' | 'center' | undefined,
  tooltipWidth: number,
  tooltipHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): TooltipLayout {
  const safeTop = VIEWPORT_PAD;
  const safeBottom = viewportHeight - getSafeBottom();
  const sheetInsets = { left: VIEWPORT_PAD, right: VIEWPORT_PAD, bottom: getSafeBottom() };

  if (!targetRect || preferredPlacement === 'center') {
    return { mode: 'center' };
  }

  if (viewportWidth < 640) {
    return { mode: 'bottom-sheet', ...sheetInsets };
  }

  const width = Math.min(tooltipWidth, viewportWidth - VIEWPORT_PAD * 2);
  const margin = 12;
  let left = targetRect.left + targetRect.width / 2 - width / 2;
  left = Math.max(VIEWPORT_PAD, Math.min(left, viewportWidth - width - VIEWPORT_PAD));

  const spaceBelow = safeBottom - targetRect.bottom - margin;
  const spaceAbove = targetRect.top - margin - safeTop;
  let placeBelow = preferredPlacement !== 'top';

  if (placeBelow && spaceBelow < tooltipHeight && spaceAbove >= tooltipHeight) {
    placeBelow = false;
  } else if (!placeBelow && spaceAbove < tooltipHeight && spaceBelow >= tooltipHeight) {
    placeBelow = true;
  }

  let top = placeBelow ? targetRect.bottom + margin : targetRect.top - margin - tooltipHeight;
  top = Math.max(safeTop, Math.min(safeBottom - tooltipHeight, top));

  if (top < safeTop || top + tooltipHeight > safeBottom) {
    return { mode: 'bottom-sheet', ...sheetInsets };
  }

  return { mode: 'anchored', top, left, width };
}
