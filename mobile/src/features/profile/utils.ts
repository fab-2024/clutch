export function toNumber(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}
