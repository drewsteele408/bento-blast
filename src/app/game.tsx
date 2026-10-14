import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameView } from '@/components/GameView';
import { GameProvider } from '@/store';
import { colors } from '@/theme';

export default function GameScreen() {
  return (
    // The Stack header already handles the top inset.
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: 'Bento Blast' }} />
      <GameProvider>
        <GameView />
      </GameProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
