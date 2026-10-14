import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameView } from '@/components/GameView';
import { colors } from '@/theme';

export default function GameScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <GameView onHome={goHome} />
    </SafeAreaView>
  );
}

function goHome() {
  // Normally Home is underneath; after a deep link straight to /game, it isn't.
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
