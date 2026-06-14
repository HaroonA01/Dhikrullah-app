import type { DhikrVariantId } from '@/lib/dhikrCompletionVariants';
import { D1Confetti } from './D1Confetti';

interface Props {
  triggerKey: number;
  variantId: DhikrVariantId;
}

export function DhikrCompletionRenderer({ triggerKey }: Props) {
  return <D1Confetti triggerKey={triggerKey} />;
}
