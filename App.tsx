import React, { useEffect, useRef } from 'react';
import { StatusBar, View, Text, Image, StyleSheet, Animated, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme';

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade + scale in
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();

    // After 2.2s, fade out
    const timer = setTimeout(() => {
      Animated.timing(fadeOut, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => onDone());
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.splash, { opacity: fadeOut }]}>
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <Image
          source={require('./assets/logo.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <Text style={styles.splashTagline}>Your offline AI assistant</Text>
        <View style={styles.splashDots}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary, opacity: 0.6 }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary, opacity: 0.3 }]} />
        </View>
      </Animated.View>
      <Text style={styles.splashVersion}>v1.0.0 · Powered by llama.cpp</Text>
    </Animated.View>
  );
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = React.useState(true);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" translucent={false} />
        {showSplash ? (
          <SplashScreen onDone={() => setShowSplash(false)} />
        ) : (
          <AppNavigator />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: width * 0.55,
    height: width * 0.34,
    marginBottom: 24,
  },
  splashTagline: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 32,
  },
  splashDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  splashVersion: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: colors.textMuted,
  },
});

export default App;
