import { useState, useEffect } from 'react';

const STEP = 24; // Each grid cell = 24px (row and column)
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

  const cols = Math.floor(availableWidth / STEP);
  const maxRows = Math.floor(availableHeight / STEP);
  const width = cols * STEP;
  const height = maxRows * STEP;

  return { cols, maxRows, width, height };
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
