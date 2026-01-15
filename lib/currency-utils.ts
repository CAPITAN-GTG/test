// Currency symbol mapping utility

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  INR: '₹',
  BTC: '₿',
};

/**
 * Get the currency symbol for a given currency code.
 * Returns the code itself if no symbol is found.
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
}
