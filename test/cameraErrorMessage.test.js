/**
 * Tests for the user-facing camera error text (src/utils/useCallModeSwitch.js).
 */
import { cameraErrorMessage } from '../src/utils/useCallModeSwitch';

const err = (name) => Object.assign(new Error(name), { name });

describe('cameraErrorMessage', () => {
  test.each(['NotAllowedError', 'SecurityError'])('%s -> permission message', (name) => {
    expect(cameraErrorMessage(err(name))).toMatch(/Allow camera access/);
  });

  test.each(['NotFoundError', 'OverconstrainedError'])('%s -> no camera message', (name) => {
    expect(cameraErrorMessage(err(name))).toMatch(/No camera found/);
  });

  // Chrome reports a camera held by another browser as NotReadableError ("Device in use"),
  // Edge as NotReadableError ("Could not start video source") after a long hang -> TimeoutError
  test.each(['NotReadableError', 'AbortError', 'TimeoutError'])('%s -> camera busy message', (name) => {
    expect(cameraErrorMessage(err(name))).toMatch(/in use by another app or browser/);
  });

  test('unknown errors fall back to the camera busy message', () => {
    expect(cameraErrorMessage(undefined)).toMatch(/in use by another app or browser/);
  });
});
