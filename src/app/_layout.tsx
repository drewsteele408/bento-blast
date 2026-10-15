import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { GameProvider, SettingsProvider } from '@/store';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      {/* Dark icons always: the app background is light even when the phone is in dark mode. */}
      <StatusBar style="dark" />
      {/* At the root, not on the game screen, so Home can read the saved game and best score,
          and Settings can reset the best score. */}
      <SettingsProvider>
        <GameProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.ink,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            {/* No header (the pause menu leads home) and no iOS swipe-back, which could fire
                while dragging a piece near the left edge. */}
            <Stack.Screen name="game" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          </Stack>
        </GameProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
