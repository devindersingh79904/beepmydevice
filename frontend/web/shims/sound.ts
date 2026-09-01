/**
 * `react-native-sound` on the web.
 *
 * Backed by a real `Audio` element, so the alert tone does play if something
 * asks it to — but two browser rules make this a weaker guarantee than the
 * native one, and both are worth knowing rather than discovering:
 *
 *   Autoplay. A browser refuses to play audio until the user has interacted
 *   with the page. A tone triggered by an incoming alert rather than by a
 *   click is rejected, and the rejection is what `play()`'s callback reports.
 *
 *   Volume. `MAIN_BUNDLE`, `setCategory('Playback')` and the silent-switch
 *   override are iOS audio-session concepts with no browser equivalent. A web
 *   page cannot raise the device volume or play through a muted phone, which
 *   is exactly the behaviour the product depends on.
 *
 * In practice nothing calls this in a browser build anyway: the sound plays in
 * response to a push, and this build receives none.
 */

import {getLogger} from '../../src/utils/logger';

const logger = getLogger('sound.web');

type LoadCallback = (error: Error | null) => void;
type PlayCallback = (success: boolean) => void;

class Sound {
  /** iOS bundle constants, kept so call sites compile unchanged. */
  static readonly MAIN_BUNDLE = '';
  static readonly DOCUMENT = '';
  static readonly LIBRARY = '';
  static readonly CACHES = '';

  /** No browser equivalent to an iOS audio session category. */
  static setCategory(): void {
    // Intentionally empty.
  }

  private readonly audio: HTMLAudioElement;

  constructor(source: string, _basePath: string, onLoad?: LoadCallback) {
    // Bundled assets are served from /sounds/ by the dev server and the build.
    this.audio = new Audio(`/sounds/${source}`);
    this.audio.preload = 'auto';

    this.audio.addEventListener('canplaythrough', () => onLoad?.(null), {once: true});
    this.audio.addEventListener(
      'error',
      () => onLoad?.(new Error(`Could not load /sounds/${source}`)),
      {once: true},
    );
  }

  play(onEnd?: PlayCallback): void {
    void this.audio
      .play()
      .then(() => onEnd?.(true))
      .catch((error: unknown) => {
        // Almost always the autoplay policy. Logged rather than thrown: a
        // blocked tone must not take down whatever triggered it.
        logger.warn('The browser refused to play the alert tone', {
          reason: String(error),
        });
        onEnd?.(false);
      });
  }

  stop(onStop?: () => void): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    onStop?.();
  }

  release(): void {
    this.audio.pause();
    this.audio.src = '';
  }

  setVolume(value: number): this {
    // Page volume only; a browser cannot change the device's.
    this.audio.volume = Math.max(0, Math.min(1, value));
    return this;
  }

  setNumberOfLoops(loops: number): this {
    this.audio.loop = loops !== 0;
    return this;
  }
}

export default Sound;
