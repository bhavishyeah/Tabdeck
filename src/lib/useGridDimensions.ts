import { useState, useEffect } from 'react';

/**
 * Grid geometry.
 *
 * One grid cell is GRID_STEP × GRID_STEP pixels. Rows and columns share the
 * same step so the canvas stays square-aligned.
 *
 * A bookmark link row is 24px tall — i.e. ROWS_PER_LINK cells. The board
 * header is also 24px. Keeping the step at 12 gives twice the positioning
 * resolution of the rendered row height, which is what makes fine-grained
 * width resizing possible without changing how anything looks.
 */
export const GRID_STEP = 12;

/** A 24px link row spans this many grid rows. */
export const ROWS_PER_LINK = 24 / GRID_STEP; // 2

const H_PADDING = 48; // 24px left + 24px right
const V_PADDING = 72; // 72px top + 0px bottom

export interface GridDimensions {
  cols: number;
  maxRows: number;
  width: number;
  height: number;
}

function calculate(): GridDimensions {
  const availableWidth = window.innerWidth - H_PADDING;
  const availableHeight = window.innerHeight - V_PADDING;

  const cols = Math.floor(availableWidth / GRID_STEP);
  const maxRows = Math.floor(availableHeight / GRID_STEP);
  const width = cols * GRID_STEP;
  const height = maxRows * GRID_STEP;

  return { cols, maxRows, width, height };
}

/** Grid columns/rows available at the current window size. */
export function gridExtent() {
  return calculate();
}

export function useGridDimensions(): GridDimensions {
  const [dimensions, setDimensions] = useState<GridDimensions>(calculate);

  useEffect(() => {
    function handleResize() {
      setDimensions(calculate());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return dimensions;
}
