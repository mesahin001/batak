/**
 * Help Modal - In-app game rules and instructions
 * Displays simplified Batak rules in the user's language
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  GestureResponderEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, SHADOWS } from '../../styles/tokens';

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
}

interface Section {
  key: string;
  icon: string;
}

export const HelpModal: React.FC<HelpModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['objective']));
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const sections: Section[] = [
    { key: 'objective', icon: '🎯' },
    { key: 'cardRanking', icon: '🃏' },
    { key: 'gameModes', icon: '🎮' },
    { key: 'bidding', icon: '📢' },
    { key: 'playing', icon: '🎴' },
    { key: 'scoring', icon: '📊' },
  ];

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const isExpanded = (key: string) => expandedSections.has(key);

  const handleSectionTouchStart = (e: GestureResponderEvent) => {
    setTouchStart({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
  };

  const handleSectionTouchEnd = (key: string, e: GestureResponderEvent) => {
    if (!touchStart) return;
    const deltaX = Math.abs(e.nativeEvent.pageX - touchStart.x);
    const deltaY = Math.abs(e.nativeEvent.pageY - touchStart.y);
    // It's a tap, not a scroll
    if (deltaX < 10 && deltaY < 10) {
      toggleSection(key);
    }
    setTouchStart(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('help.title')}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            scrollEnabled={true}
          >
            {sections.map((section) => (
              <View key={section.key} style={styles.sectionContainer}>
                <View
                  style={styles.sectionHeader}
                  onTouchStart={handleSectionTouchStart}
                  onTouchEnd={(e) => handleSectionTouchEnd(section.key, e)}
                >
                  <View style={styles.sectionHeaderLeft}>
                    <Text style={styles.sectionIcon}>{section.icon}</Text>
                    <Text style={styles.sectionTitle}>{t(`help.${section.key}.title`)}</Text>
                  </View>
                  <Text style={[styles.chevron, isExpanded(section.key) && styles.chevronExpanded]}>
                    {isExpanded(section.key) ? '▼' : '▶'}
                  </Text>
                </View>

                {isExpanded(section.key) && (
                  <View style={styles.sectionContent}>
                    {/* Objective */}
                    {section.key === 'objective' && (
                      <Text style={styles.contentText}>{t('help.objective.content')}</Text>
                    )}

                    {/* Card Ranking */}
                    {section.key === 'cardRanking' && (
                      <Text style={styles.contentText}>{t('help.cardRanking.content')}</Text>
                    )}

                    {/* Game Modes */}
                    {section.key === 'gameModes' && (
                      <View style={styles.gameModesContent}>
                        <View style={styles.modeItem}>
                          <Text style={styles.modeLabel}>{t('lobby.kozMaca')}:</Text>
                          <Text style={styles.modeText}>{t('help.gameModes.kozMaca')}</Text>
                        </View>
                        <View style={styles.modeItem}>
                          <Text style={styles.modeLabel}>{t('lobby.ihaleliBatak')}:</Text>
                          <Text style={styles.modeText}>{t('help.gameModes.ihaleli')}</Text>
                        </View>
                      </View>
                    )}

                    {/* Bidding */}
                    {section.key === 'bidding' && (
                      <Text style={styles.contentText}>{t('help.bidding.content')}</Text>
                    )}

                    {/* Playing */}
                    {section.key === 'playing' && (
                      <View style={styles.playingContent}>
                        <Text style={styles.playingRule}>• {t('help.playing.followSuit')}</Text>
                        <Text style={styles.playingRule}>• {t('help.playing.trump')}</Text>
                      </View>
                    )}

                    {/* Scoring */}
                    {section.key === 'scoring' && (
                      <View style={styles.scoringContent}>
                        <View style={styles.scoreItem}>
                          <Text style={styles.scoreLabel}>✓</Text>
                          <Text style={styles.scoreText}>{t('help.scoring.success')}</Text>
                        </View>
                        <View style={styles.scoreItem}>
                          <Text style={styles.scoreLabel}>✗</Text>
                          <Text style={styles.scoreText}>{t('help.scoring.fail')}</Text>
                        </View>
                        <View style={styles.scoreItem}>
                          <Text style={styles.scoreLabel}>○</Text>
                          <Text style={styles.scoreText}>{t('help.scoring.nonBidder')}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <TouchableOpacity style={styles.footerButton} onPress={onClose}>
            <Text style={styles.footerButtonText}>{t('help.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    backgroundColor: COLORS.feltDark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '85%',
    borderTopWidth: 2,
    borderTopColor: COLORS.goldPrimary,
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.goldPrimary,
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
  },
  sectionContainer: {
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  chevron: {
    fontSize: 12,
    color: COLORS.goldPrimary,
    marginLeft: 8,
  },
  chevronExpanded: {
    transform: [{ rotate: '0deg' }],
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
  },
  contentText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  gameModesContent: {
    gap: 12,
  },
  modeItem: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 12,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.goldPrimary,
    marginBottom: 4,
  },
  modeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  playingContent: {
    gap: 8,
  },
  playingRule: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  scoringContent: {
    gap: 10,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 12,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.goldPrimary,
    marginRight: 10,
    minWidth: 20,
  },
  scoreText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  footerButton: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: COLORS.goldPrimary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.feltDark,
  },
});
