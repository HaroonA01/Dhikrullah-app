import { useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useBackdropDim } from '@/lib/useBackdropDim';

interface Props {
  visible: boolean;
  description?: string | null;
  reference?: string | null;
  grade?: string | null;
  onClose: () => void;
}

export function InfoModal({ visible, description, reference, grade, onClose }: Props) {
  const { palette } = useTheme();
  const backdrop = useBackdropDim(0.4);
  const hasDescription = !!description && description.trim().length > 0;
  const hasReference = !!reference && reference.trim().length > 0;
  const hasGrade = !!grade && grade.trim().length > 0;
  const hasAny = hasDescription || hasReference || hasGrade;

  const cardBg = palette.scheme === 'dark' ? palette.bgMid : '#FFFFFF';
  const windowH = Dimensions.get('window').height;
  const maxScrollH = Math.round(windowH * 0.6);

  const [scrollH, setScrollH] = useState(0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={[styles.backdrop, { backgroundColor: backdrop }]} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.borderOverlay,
              { borderColor: palette.glassBorder },
            ]}
          />
          <Pressable style={styles.close} onPress={onClose} hitSlop={12}>
            <X size={18} color={palette.textMid} strokeWidth={2} />
          </Pressable>

          <View style={{ height: scrollH }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              onContentSizeChange={(_, h) => setScrollH(Math.min(h, maxScrollH))}
            >
              {!hasAny && (
                <Text style={[styles.empty, { color: palette.textMid }]}>
                  No additional information yet.
                </Text>
              )}

              {hasReference && (
                <Text style={[styles.refTitle, { color: palette.accent }]}>
                  {reference}
                </Text>
              )}

              {hasDescription && (
                <Text style={[styles.description, { color: palette.textDark }]}>
                  {description}
                </Text>
              )}

              {hasGrade && (
                <Text style={[styles.grade, { color: palette.textDim }]}>
                  {grade}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingTop: 40,
    paddingBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  borderOverlay: {
    borderWidth: 1,
    borderRadius: 18,
  },
  close: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
    zIndex: 2,
  },
  body: {
    gap: 10,
  },
  refTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  grade: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  empty: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
});
