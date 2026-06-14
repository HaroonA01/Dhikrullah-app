import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeartHandshake, Share2 } from 'lucide-react-native';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassCard } from '@/components/GlassCard';
import { GeometricPattern } from '@/components/GeometricPattern';
import { LeafCorner } from '@/components/share/LeafCorner';
import { QuoteBlock } from '@/components/share/QuoteBlock';
import { HeroLogo } from '@/components/share/HeroLogo';
import { useTheme } from '@/context/ThemeContext';
import { type Palette } from '@/constants/themes';
import { SHARE_INVITE_MESSAGE } from '@/constants/about';
import { shareAppInvite } from '@/lib/shareApp';

function ShareButton({ label, onPress, palette }: { label: string; onPress: () => void; palette: Palette }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: palette.accent, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Share2 size={15} color="#fff" strokeWidth={2} />
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

export default function ShareScreen() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const shareApp = async () => {
    await shareAppInvite(SHARE_INVITE_MESSAGE);
  };

  return (
    <View style={styles.root}>
      <GradientBackground />
      <GeometricPattern />

      {/* Screen-level leaf accents */}
      <LeafCorner position="bottomLeft" size={180} opacity={0.20} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.wordmark, { color: palette.accent }]}>DHIKRULLAH</Text>
        <Text style={[styles.title, { color: palette.textDark }]}>Spread the Reward</Text>
      </View>

      <View style={[styles.cardWrap, { paddingBottom: insets.bottom + 100 }]}>
        <GlassCard style={[styles.card, { backgroundColor: palette.scheme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.72)' }]}>
          {/* Card-level leaf accents */}
          <LeafCorner position="topRight" size={108} opacity={0.28} />

          {/* Hero block */}
          <View style={styles.appLogoBlock}>
            <HeroLogo Icon={HeartHandshake} />
            <Text style={[styles.appWordmark, { color: palette.accent }]}>DHIKRULLAH</Text>
            <Text style={[styles.appSubtitle, { color: palette.textDark }]}>Spread the Reward</Text>
          </View>

          {/* Quote */}
          <QuoteBlock
            body="Whoever guides someone to a good deed will have a reward like the one who does it."
            attribution="Sahih Muslim 1893"
          />

          {/* Explanation */}
          <View style={styles.explanationWrap}>
            <Text style={[styles.explanation, { color: palette.textMid }]}>
              Every time someone you share Dhikrullah with completes a dhikr, you receive a reward equal to theirs — without diminishing it in the slightest. This is Sadaqah Jariyah: a continuous charity that does not end with this life.
            </Text>
          </View>

          <ShareButton label="Share the App" onPress={shareApp} palette={palette} />
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  wordmark: { fontSize: 12, letterSpacing: 1.5, fontWeight: '600', opacity: 0.8 },
  title: { fontSize: 26, fontWeight: '700', marginTop: 2 },
  cardWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    flex: 1,
    padding: 22,
    overflow: 'hidden',
  },
  appLogoBlock: {
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 24,
  },
  appWordmark: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 6,
  },
  appSubtitle: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  explanationWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  explanation: {
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
