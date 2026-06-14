import { View, useWindowDimensions, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';

const VB_W = 1026;
const VB_H = 614;

// Mountain path builders — only the left-edge y value changes per preset;
// the rest of the curve / control points stay fixed.
const buildBackPath = (y: number): string =>
  `M0 614 L0 ${y} C119 450 137 393 330 499 L993 522 C1006 515 1006 507 1024 495 L1024 614 Z`;
const buildMidPath = (y: number): string =>
  `M0 614 L0 ${y} C161 356 147 277 454 437 L861 451 C896 459 1024 393 1024 408 L1024 614 Z`;
const buildFrontPath = (y: number): string =>
  `M0 614 L0 ${y} C299 232 420 353 552 372 L742 383 C814 409 929 371 1024 347 L1024 614 Z`;

// Per-scheme defaults baked from the variation-picker session.
// Light: bottom-darkest (back > mid > front opacity), shallower mountains.
// Dark:  top-darkest    (front > mid > back opacity), lower mountains, with
// the overall alpha reduced so silhouettes sit softer against the night gradient.
const DEFAULT_LIGHT_OPACITIES: readonly [number, number, number] = [0.38, 0.25, 0.12];
const DEFAULT_DARK_OPACITIES:  readonly [number, number, number] = [0.05, 0.15, 0.15];
const DEFAULT_LIGHT_STARTS: readonly [number, number, number] = [500, 380, 250];
const DEFAULT_DARK_STARTS:  readonly [number, number, number] = [550, 430, 320];

// Outer boundary of the mosque silhouette, traced clockwise from off-screen
// bottom-left around: left base sweep → left side arch → left short minaret
// (with crescent finial spire) → main wide central dome (onion) with crescent
// → right short minaret (mirror) → small finial → wall → tall right minaret
// with tiered balconies + crescent → right side arch → right base sweep →
// off-screen bottom-right. Coordinates derived from the user-provided SVG
// endpoints.
const MOSQUE_D = [
  'M-50 614',
  'L-50 612',
  // left base sweep up to platform
  'C 100 590 230 530 330 532',
  'L 330 500',
  'L 356 500',
  'L 356 485',
  // corner curve
  'C 357 473 358 467 367 467',
  // left side arch (peak inward going up at x≈398)
  'C 366 453 374 445 397 431',
  'C 422 445 430 453 428 467',
  // wall up to left short minaret
  'L 438 467',
  'C 440 458 444 453 455 447',
  // left short minaret — tiered stack
  'L 455 348',
  'L 450 333',
  'L 450 316',
  'L 458 316',
  'L 458 243',
  'L 453 230',
  'L 453 215',
  'L 462 215',
  'L 462 178',
  // left small dome (onion shoulder) on the short minaret
  'C 447 156 477 117 477 115',
  // Central spire — smooth tapering body up to crescent moon at apex (shorter)
  'Q 473 108 477 100',
  'L 477 88',
  'Q 475 80 477 70',
  'L 477 62',
  'Q 476 56 478 50',
  'L 480 50',
  'Q 482 56 481 62',
  'L 481 70',
  'Q 483 80 481 88',
  'L 481 100',
  'Q 485 108 480 115',
  // right small dome shoulder — curls outward + down to the right
  'C 485 122 510 156 495 178',
  // right short minaret mirror down
  'L 495 215',
  'L 503 215',
  'L 503 230',
  'L 498 243',
  'L 498 316',
  'L 506 316',
  'L 506 333',
  'L 501 348',
  'L 501 412',
  // small finial on right minaret base
  'L 503 412',
  'L 503 402',
  // small dome (between right short minaret and main dome) — left half UP
  'C 509 392 516 389 528 380',
  // small finial spike on top of the small dome
  'L 528 367',
  'L 530 367',
  'L 530 380',
  // small dome right half DOWN to base
  'C 541 388 548 391 553 402',
  // short wall across to MAIN central wide dome base
  'L 559 399',
  // MAIN DOME — wide onion (left half)
  'C 515 314 640 275 645 251',
  // main dome neck + crescent spire (symmetric: left + right both 251→218)
  'L 647 240',
  'L 647 218',
  'C 645 212 645 207 648 205',
  'L 649 205',
  // mirror right side of crescent
  'C 652 207 652 212 650 218',
  'L 650 240',
  'L 652 251',
  // MAIN DOME right half (mirror onion) — back down to base
  'C 655 275 781 314 737 399',
  // small finial / connector wall to tall right minaret
  'L 743 403',
  'C 748 388 757 388 767 379',
  'L 767 366',
  'L 769 366',
  'L 769 380',
  'C 773 384 776 382 782 390',
  // tall right minaret — base, balconies, top tier
  'L 781 300',
  'L 775 283',
  'L 775 265',
  // step IN at balcony ledge
  'L 786 265',
  'L 786 175',
  // diagonal narrowing to top tier
  'L 778 161',
  'L 778 144',
  // step IN at top ledge
  'L 789 144',
  'L 789 102',
  // onion shoulder up to crescent base (left side of tall minaret)
  'C 774 81 807 41 804 40',
  // tall minaret crescent spire — smooth taper to apex
  'Q 803 26 806 8',
  'L 806 0',
  'L 809 0',
  'Q 812 26 811 40',
  // onion shoulder down right neck of tall minaret
  'C 810 41 842 81 827 103',
  'L 827 144',
  // step OUT at top ledge (mirror)
  'L 838 144',
  'L 838 161',
  // diagonal back out to middle tier
  'L 830 175',
  'L 830 265',
  // step OUT at balcony ledge (mirror)
  'L 841 265',
  'L 841 284',
  // diagonal back to base width
  'L 835 301',
  'L 835 431',
  // curve to right side arch base
  'C 856 444 863 452 864 464',
  'L 869 464',
  // right side arch (mirror of left arch)
  'C 868 450 876 442 900 428',
  'C 924 442 932 450 930 464',
  // wall transition + right base out to right edge
  'L 943 464',
  'C 941 464 944 467 944 475',
  'L 944 500',
  'L 979 500',
  'L 979 520',
  'C 1009 527 1019 530 1024 535',
  'L 1080 614',
  'Z',
].join(' ');

// Light mode uses vibrant palette.accent for everything. Dark mode darkens the
// accent so it sits softer against the night gradient: mountains take a mid
// darken (visible but not glaring), mosque takes a deeper darken so it still
// reads as a solid silhouette in front of the dimmer mountains.
const DARK_MOUNTAIN_DARKEN = 0.4;
const DARK_MOSQUE_DARKEN = 0.65;

function parseColor(input: string): { r: number; g: number; b: number } {
  if (input.startsWith('rgb')) {
    const nums = input.match(/\d+/g);
    if (nums && nums.length >= 3) {
      return { r: Number(nums[0]), g: Number(nums[1]), b: Number(nums[2]) };
    }
  }
  const clean = input.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function withAlpha(color: string, alpha: number): string {
  const { r, g, b } = parseColor(color);
  return `rgba(${r},${g},${b},${alpha})`;
}

function darken(color: string, factor: number): string {
  const { r, g, b } = parseColor(color);
  const k = 1 - factor;
  const toHex = (n: number) => Math.round(n * k).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

interface MosqueSilhouetteProps {
  style?: ViewStyle;
  // [back, mid, front] alpha overrides. Defaults to [0.85, 0.68, 0.52].
  opacities?: readonly [number, number, number];
  // [back, mid, front] left-edge y in viewBox units. Defaults to [430, 291, 122].
  mountainStarts?: readonly [number, number, number];
}

export function MosqueSilhouette({
  style,
  opacities,
  mountainStarts,
}: MosqueSilhouetteProps): React.ReactElement {
  const { palette } = useTheme();
  const isDark = palette.scheme === 'dark';
  const mountainColor = isDark ? darken(palette.accent, DARK_MOUNTAIN_DARKEN) : palette.accent;
  const mosqueColor = isDark ? darken(palette.accent, DARK_MOSQUE_DARKEN) : palette.accent;
  const effOpacities = opacities ?? (isDark ? DEFAULT_DARK_OPACITIES : DEFAULT_LIGHT_OPACITIES);
  const effStarts = mountainStarts ?? (isDark ? DEFAULT_DARK_STARTS : DEFAULT_LIGHT_STARTS);

  const { width: screenW } = useWindowDimensions();
  const height = (screenW * VB_H) / VB_W;

  return (
    <View style={[{ width: screenW, height }, style]} pointerEvents="none">
      <Svg
        width={screenW}
        height={height}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        {/* Render order: tallest peaks FIRST (backdrop), shortest LAST so each
            mountain's ridge band is visible distinctly. The shortest mountain
            (drawn last on top) gets the highest opacity — bottom of the scene
            ends up the darkest, gradient lightens going up. */}
        <Path d={buildFrontPath(effStarts[2])} fill={withAlpha(mountainColor, effOpacities[2])} />
        <Path d={buildMidPath(effStarts[1])} fill={withAlpha(mountainColor, effOpacities[1])} />
        <Path d={buildBackPath(effStarts[0])} fill={withAlpha(mountainColor, effOpacities[0])} />
        <Path d={MOSQUE_D} fill={mosqueColor} />
      </Svg>
    </View>
  );
}
