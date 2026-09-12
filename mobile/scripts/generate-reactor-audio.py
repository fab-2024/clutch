"""Deterministic original mechanical cue. No recordings or third-party samples."""
import math, random, struct, wave
from pathlib import Path
RATE = 22050
DURATION = 3.9
rng = random.Random(3900)
phase = 0.0
samples = []
for index in range(round(RATE * DURATION)):
    t = index / RATE
    charge = math.sin(math.pi * min(1, t / 1.26)) ** 2
    phase += 2 * math.pi * (85 + 175 * min(1, t / 1.26) ** 2) / RATE
    value = charge * (.13 * math.sin(phase) + .035 * math.sin(phase * 2.01))
    for start in (1.62, 2.42, 2.65, 3.15):
        age = t - start
        if 0 <= age < .16:
            value += math.exp(-age * 48) * (.14 * math.sin(age * math.tau * 180) + .045 * rng.uniform(-1, 1))
    if 3.15 < t < 3.85:
        value += .045 * math.sin(t * math.tau * 92) * math.sin(math.pi * (t - 3.15) / .7) ** 2
    samples.append(struct.pack('<h', round(max(-1, min(1, value)) * 32767)))
path = Path(__file__).resolve().parents[1] / 'assets/social/reactor/audio/mechanical-evolution.wav'
with wave.open(str(path), 'wb') as out:
    out.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
    out.writeframes(b''.join(samples))
print(path)
