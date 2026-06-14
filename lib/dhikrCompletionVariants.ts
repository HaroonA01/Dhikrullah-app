export type DhikrVariantId =
  | 'd1'
  | 'd2'
  | 'd4'
  | 'd5'
  | 'd6'
  | 'd11'
  | 'd14'
  | 'd16'
  | 'd17';

export const ALLOWED_DHIKR_VARIANTS: readonly DhikrVariantId[] = [
  'd1', 'd2', 'd4', 'd5', 'd6', 'd11', 'd14', 'd16', 'd17',
];

export function shuffleDhikrVariants(): DhikrVariantId[] {
  const a: DhikrVariantId[] = [...ALLOWED_DHIKR_VARIANTS];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
