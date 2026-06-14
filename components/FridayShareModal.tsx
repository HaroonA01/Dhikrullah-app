import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Share2, Sparkles, X } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useBackdropDim } from '@/lib/useBackdropDim';
import { SHARE_INVITE_MESSAGE } from '@/constants/about';
import { shareAppInvite } from '@/lib/shareApp';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const HADITH_BODY =
  'Whoever guides someone to goodness will have a reward like one who did it.';
const HADITH_REF = 'Sahih Muslim 1893';

export function FridayShareModal({ visible, onClose }: Props) {
  const { palette } = useTheme();
  const backdrop = useBackdropDim(0.45);
  const cardBg = palette.scheme === 'dark' ? palette.bgMid : '#FFFFFF';

  const handleShare = async () => {
    try {
      await shareAppInvite(SHARE_INVITE_MESSAGE);
    } finally {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: backdrop }]} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: cardBg }]}
          onPress={() => {}}
        >
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.cardBorder,
              { borderColor: palette.glassBorder },
            ]}
          />

          <View style={styles.header}>
            <View
              style={[styles.iconTile, { backgroundColor: palette.accentLight }]}
            >
              <Sparkles size={18} color={palette.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.eyebrow, { color: palette.accent }]}>
              JUMU&apos;AH REMINDER
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <X size={18} color={palette.textMid} strokeWidth={2} />
            </Pressable>
          </View>

          <View
            style={[styles.divider, { backgroundColor: palette.glassBorder }]}
          />

          <View
            style={[
              styles.quoteWrap,
              { borderLeftColor: palette.accent },
            ]}
          >
            <Text style={[styles.quoteBody, { color: palette.textDark }]}>
              {HADITH_BODY}
            </Text>
            <Text style={[styles.quoteRef, { color: palette.textMid }]}>
              — {HADITH_REF}
            </Text>
          </View>

          <Text style={[styles.subtitle, { color: palette.textMid }]}>
            Share Dhikrullah this Jumu&apos;ah and earn the reward of every
            dhikr made by those you guide — Sadaqah Jariyah.
          </Text>

          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [
              styles.shareBtn,
              { backgroundColor: palette.accent },
              pressed && { opacity: 0.78 },
            ]}
          >
            <Share2 size={16} color="#FFF" strokeWidth={2} />
            <Text style={styles.shareBtnText}>Share the App</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.dismissBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.dismissText, { color: palette.textMid }]}>
              Maybe later
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  cardBorder: {
    borderWidth: 1,
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 14,
    opacity: 0.6,
  },
  quoteWrap: {
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 6,
    borderLeftWidth: 3,
    marginBottom: 14,
  },
  quoteBody: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  quoteRef: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  shareBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dismissBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
