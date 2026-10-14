// Runs before each test file, after the jest-expo preset and Gesture Handler's jestSetup.
// Worklets has no native runtime in Jest, so use its mock; Reanimated then runs worklets
// on the JS thread.

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));

require('react-native-reanimated').setUpTests();

// MMKV swaps in an in-memory mock under Jest, but importing it still loads Nitro, which looks
// up its native module at import time. The mock path never creates a native object, so a stub
// is enough.
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: jest.fn(() => ({})) },
}));
