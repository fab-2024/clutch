"""Original synthesized Forge cue; timings match forgeMotion.ts. No samples."""
import math, random, struct, wave
from pathlib import Path
rate = 44100
rng = random.Random(4200)
phase = 0.0
samples = []
for i in range(round(rate * 5.0)):
    t = i / rate
    phase += math.tau * (64 + 160 * min(1, t / 1.8) ** 2) / rate
    charge = math.sin(math.pi * min(1, t / 1.8)) ** .7 if t < 1.8 else 0
    value = charge * (.12 * math.sin(phase) + .03 * math.sin(phase * 2.01))
    for start, frequency, strength in [(2.0, 65, .35), (2.14, 90, .32), (2.55, 160, .18), (2.95, 220, .2), (3.2, 260, .2), (3.7, 80, .25)]:
        age = t - start
        if 0 <= age < .3:
            value += math.exp(-age * 25) * strength * (math.sin(math.tau * frequency * age) + .35 * rng.uniform(-1, 1))
    if 2.6 < t < 3.35:
        age = (t - 2.6) / .75
        value += .05 * math.sin(math.pi * age) * math.sin(math.tau * (120 * t + 60 * t * t))
    if 3.15 < t < 4.18:
        age = t - 3.15
        value += .04 * math.sin(math.pi * age / 1.03) * (math.sin(math.tau * 110 * age) + .45 * math.sin(math.tau * 330 * age))
    if .8 < t < 2.1:
        value += .035 * math.sin(t * 89) * rng.uniform(-1, 1)
    if 2 < t < 3.6:
        value += .09 * math.exp(-(t-2)*2.5) * rng.uniform(-1, 1)
    samples.append(struct.pack('<h', round(max(-.95, min(.95, value)) * 32767)))
path = Path(__file__).resolve().parents[1] / 'assets/social/reactor/audio/overheat-demo.wav'
with wave.open(str(path), 'wb') as out:
    out.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
    out.writeframes(b''.join(samples))
print(path)
