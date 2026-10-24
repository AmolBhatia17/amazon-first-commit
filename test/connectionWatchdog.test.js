/**
 * Tests for the peer-connection watchdog (src/utils/connectionWatchdog.js).
 *
 * A fake RTCPeerConnection (an EventTarget with the two state fields) is driven
 * through state changes with Jest's fake timers.
 */
import { watchPeerConnection, DISCONNECT_GRACE_MS } from '../src/utils/connectionWatchdog';

const makePc = () => {
  const pc = new EventTarget();
  pc.iceConnectionState = 'connected';
  pc.connectionState = 'connected';
  pc.set = (ice, conn = ice) => {
    pc.iceConnectionState = ice;
    pc.connectionState = conn;
    pc.dispatchEvent(new Event('iceconnectionstatechange'));
    pc.dispatchEvent(new Event('connectionstatechange'));
  };
  return pc;
};

describe('watchPeerConnection', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('a brief disconnect that recovers does not end the call', () => {
    const pc = makePc();
    const onLost = jest.fn();
    watchPeerConnection(pc, onLost);

    pc.set('disconnected');
    jest.advanceTimersByTime(DISCONNECT_GRACE_MS - 1000);
    pc.set('connected');
    jest.advanceTimersByTime(DISCONNECT_GRACE_MS * 2);

    expect(onLost).not.toHaveBeenCalled();
  });

  test('a disconnect that lasts past the grace period ends the call once', () => {
    const pc = makePc();
    const onLost = jest.fn();
    watchPeerConnection(pc, onLost);

    pc.set('disconnected');
    jest.advanceTimersByTime(DISCONNECT_GRACE_MS - 1);
    expect(onLost).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onLost).toHaveBeenCalledTimes(1);

    pc.set('failed');
    expect(onLost).toHaveBeenCalledTimes(1);
  });

  test.each(['failed', 'closed'])('%s ends the call immediately', (state) => {
    const pc = makePc();
    const onLost = jest.fn();
    watchPeerConnection(pc, onLost);

    pc.set(state);

    expect(onLost).toHaveBeenCalledTimes(1);
  });

  test('either state field can report the failure', () => {
    const pc = makePc();
    const onLost = jest.fn();
    watchPeerConnection(pc, onLost);

    pc.set('connected', 'failed');

    expect(onLost).toHaveBeenCalledTimes(1);
  });

  test('stopping the watch cancels a pending grace timer', () => {
    const pc = makePc();
    const onLost = jest.fn();
    const stop = watchPeerConnection(pc, onLost);

    pc.set('disconnected');
    stop();
    jest.advanceTimersByTime(DISCONNECT_GRACE_MS * 2);
    pc.set('failed');

    expect(onLost).not.toHaveBeenCalled();
  });
});
