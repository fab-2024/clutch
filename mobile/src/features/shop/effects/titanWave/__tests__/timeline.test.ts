import { pulse, rockFrame, TITAN_ROCKS, TITAN_WAVE_DURATION } from '../timeline';

describe('Titan Wave timing', () => {
  it('leaves no particle or fissure energy at either endpoint', () => {
    for (const time of [0, TITAN_WAVE_DURATION]) {
      expect(pulse(time, 0, 280, 1480)).toBe(0);
      expect(pulse(time, 250, 390, 850)).toBe(0);
      for (const rock of TITAN_ROCKS) expect(rockFrame(time, rock.delay).opacity).toBe(0);
    }
  });
  it('returns each rock to ground after a ballistic ascent and fall', () => {
    for (const rock of TITAN_ROCKS) {
      expect(rockFrame(rock.delay, rock.delay).height).toBe(0);
      expect(rockFrame(rock.delay + 330, rock.delay).height).toBe(1);
      expect(rockFrame(rock.delay + 660, rock.delay).height).toBe(0);
      expect(rockFrame(rock.delay + 600, rock.delay).height).toBeLessThan(rockFrame(rock.delay + 450, rock.delay).height);
    }
  });
});
