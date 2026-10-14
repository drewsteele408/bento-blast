// Runs before each test file, after the jest-expo preset and Gesture Handler's jestSetup.
// Worklets has no native runtime in Jest, so use its mock; Reanimated then runs worklets
// on the JS thread.

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));

require('react-native-reanimated').setUpTests();
