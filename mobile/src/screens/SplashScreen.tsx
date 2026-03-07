import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const suitOpacities = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const titleScale = useRef(new Animated.Value(0.6)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const dividerWidth = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(10)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 0-400ms: suits staggered fade in
      Animated.stagger(100, suitOpacities.map(op =>
        Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: false })
      )),
      // 200-700ms: BATAK title spring
      Animated.parallel([
        Animated.spring(titleScale, { toValue: 1.0, friction: 6, tension: 120, useNativeDriver: false }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]),
      // 600-900ms: gold divider
      Animated.timing(dividerWidth, { toValue: 220, duration: 300, useNativeDriver: false }),
      // 800-1100ms: TOURNAMENT subtitle
      Animated.parallel([
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(subtitleTranslateY, { toValue: 0, duration: 300, useNativeDriver: false }),
      ]),
      // 1100-1500ms: footer fade in
      Animated.timing(footerOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      // 1700ms: pause
      Animated.delay(400),
      // 2100-2500ms: fade out
      Animated.timing(screenOpacity, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start(() => onFinish());
  }, []);

  const suits = ['♠', '♥', '♦', '♣'];

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Suit symbols row */}
      <View style={styles.suitsRow}>
        {suits.map((suit, i) => (
          <Animated.Text
            key={suit}
            style={[
              styles.suit,
              i === 1 || i === 2 ? styles.suitRed : styles.suitBlack,
              { opacity: suitOpacities[i] },
            ]}
          >
            {suit}
          </Animated.Text>
        ))}
      </View>

      {/* BATAK title */}
      <Animated.Text
        style={[
          styles.title,
          { opacity: titleOpacity, transform: [{ scale: titleScale }] },
        ]}
      >
        BATAK
      </Animated.Text>

      {/* Gold divider */}
      <Animated.View style={[styles.divider, { width: dividerWidth }]} />

      {/* TOURNAMENT subtitle */}
      <Animated.Text
        style={[
          styles.subtitle,
          { opacity: subtitleOpacity, transform: [{ translateY: subtitleTranslateY }] },
        ]}
      >
        TOURNAMENT
      </Animated.Text>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
        <Text style={styles.footerSuits}>♠ ♥ ♦ ♣</Text>
        <Text style={styles.footerUrl}>batakci.xyz</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d2818',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suitsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
  },
  suit: {
    fontSize: 40,
  },
  suitBlack: {
    color: '#d4af37',
  },
  suitRed: {
    color: '#c0392b',
  },
  title: {
    fontSize: 56,
    fontWeight: '900',
    color: '#d4af37',
    letterSpacing: 12,
    marginBottom: 16,
  },
  divider: {
    height: 2,
    backgroundColor: '#d4af37',
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a89060',
    letterSpacing: 8,
    marginBottom: 60,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    gap: 8,
  },
  footerSuits: {
    fontSize: 16,
    color: '#4a7c5a',
    letterSpacing: 6,
  },
  footerUrl: {
    fontSize: 12,
    color: '#4a7c5a',
    letterSpacing: 2,
  },
});
