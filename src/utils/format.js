export function formatVND(amount) {
  if (!amount || amount === 0) return '0';
  return Math.round(amount).toLocaleString('vi-VN');
}

export function parseVND(str) {
  if (typeof str === 'number') return str;
  return parseInt(String(str).replace(/\./g, '').replace(/\s/g, '')) || 0;
}

export function formatMillionsToVND(millions) {
  const raw = Math.round(millions * 1_000_000);
  return formatVND(raw) + ' ₫';
}

export function formatCurrencyPhone(valInMillions) {
  if (!valInMillions || valInMillions === 0) return '0';
  const raw = Math.round(Number(valInMillions) * 1_000_000);
  return formatVND(raw);
}

export function roundMil(val) {
  return Math.round(val * 1_000_000) / 1_000_000;
}
