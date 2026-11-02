import type { AreaOption } from './catalog';

export interface Extra {
  name: string;
  price: number;
}

export const EXTRAS: Extra[] = [
  { name: 'Máscara calmante pós-laser', price: 45 },
  { name: 'Hidratação com ácido hialurônico', price: 60 },
  { name: 'Kit home care Monalisa', price: 89 },
];

export const MORNING = ['7h', '7h30', '8h', '8h30', '9h', '9h30', '10h', '10h30', '11h', '11h30', '12h', '12h30'];
export const AFTERNOON = ['13h', '13h30', '14h', '14h30', '15h', '15h30', '16h', '16h30', '17h', '17h30', '18h', '18h30'];
export const WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
/** Days of the month that are fully booked in every month shown, besides every Sunday. */
export const FULL_DAYS = [12, 20, 27];

export const daysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();

export const weekdayOf = (year: number, month: number, day: number): number => new Date(year, month, day).getDay();

export const isDayOff = (year: number, month: number, day: number): boolean =>
  weekdayOf(year, month, day) === 0 || FULL_DAYS.includes(day);

export const formatDateLabel = (day: number, month: number): string =>
  `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`;

/** Strips everything but digits, e.g. "a partir de R$ 1.200" -> 1200. */
export const priceNumber = (price: string): number => Number(String(price).replace(/[^0-9]/g, '')) || 0;

export const brl = (n: number): string => 'R$ ' + n.toLocaleString('pt-BR');

/** Deterministic "fully booked" pattern for a given day/slot-index pair. */
export const isSlotTaken = (day: number, slotIndex: number): boolean => (day * 3 + slotIndex * 7) % 9 === 0;

export interface CartLine {
  /** Index into CATALOG_ITEMS. */
  i: number;
  /** Number of sessions. */
  n: number;
  /** Chosen area names for this procedure. */
  a: string[];
}

interface PricedItem {
  name: string;
  areas: AreaOption[];
}

export interface LineBreakdown {
  /** Sum of the fixed-price selected areas, times sessions. */
  amount: number;
  /** True when at least one selected area has no fixed price (needs a quote). */
  hasQuote: boolean;
}

export function lineBreakdown(item: PricedItem, line: CartLine): LineBreakdown {
  let perSession = 0;
  let hasQuote = false;
  for (const name of line.a) {
    const opt = item.areas.find((a) => a.name === name);
    if (!opt) continue;
    if (opt.price == null) hasQuote = true;
    else perSession += opt.price;
  }
  return { amount: perSession * line.n, hasQuote };
}

export interface SummaryLine {
  k: string;
  v: string;
  amt: number;
  hasQuote: boolean;
}

export function summaryLines(cart: CartLine[], extraIdx: number[], items: PricedItem[]): SummaryLine[] {
  const cartLines = cart.map((c) => {
    const item = items[c.i];
    const { amount, hasQuote } = lineBreakdown(item, c);
    const label = item.name + (c.a.length ? ` (${c.a.join(', ')})` : '') + (c.n > 1 ? ` ×${c.n}` : '');
    const value = hasQuote ? (amount > 0 ? `${brl(amount)} + orçamento` : 'sob avaliação') : brl(amount);
    return { k: label, v: value, amt: amount, hasQuote };
  });
  const extraLines = extraIdx.map((i) => ({ k: EXTRAS[i].name, v: brl(EXTRAS[i].price), amt: EXTRAS[i].price, hasQuote: false }));
  return [...cartLines, ...extraLines];
}
