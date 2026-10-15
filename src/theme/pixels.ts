// Pixel-art sizing shared by the blocks and the board's lacquer rim, so both are drawn on the
// same art-pixel grid.

import { PixelRatio } from 'react-native';

import { sizes } from './sizes';

/** Size of one art pixel, snapped to device pixels so edges stay crisp. Never below 1pt. */
export function artPixel(size: number): number {
  return Math.max(1, PixelRatio.roundToNearestPixel(size / sizes.blockPixels));
}

/** Width of the lacquer rim on each side of the board, in whole art pixels of its blocks. */
export function boardRim(cellSize: number): number {
  return sizes.boardRimPixels * artPixel(cellSize - sizes.cellGap);
}
