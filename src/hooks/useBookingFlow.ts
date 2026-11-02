import { useEffect, useMemo, useRef, useState } from 'react';
import { CATALOG_ITEMS } from '../data/catalog';
import { EXTRAS, lineBreakdown } from '../data/booking';
import type { CartLine } from '../data/booking';

export type PayMethod = 'pix' | 'card' | 'local';

const FLIP_DURATION_MS = 720;
const JUMP_STEP_MS = 740;
/** The booking calendar's earliest selectable month. */
const BASE_YEAR = 2026;
const BASE_MONTH = 10; // November (0-indexed)

export function useBookingFlow() {
  const [bookOpen, setBookOpen] = useState(false);
  const [bkS, setBkS] = useState(0);
  const [bkFlip, setBkFlip] = useState(-1);
  const [bkMax, setBkMax] = useState(0);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [extraIdx, setExtraIdx] = useState<number[]>([]);

  const [day, setDay] = useState<number | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>('pix');
  const [pixStart, setPixStart] = useState(0);
  const [pixCopied, setPixCopied] = useState(false);
  const [cardNum, setCardNumState] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardInst, setCardInst] = useState('1');
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState('');
  const [paidWith, setPaidWith] = useState<PayMethod | null>(null);
  const [, setTick] = useState(0);

  const bkSRef = useRef(0);
  const bookOpenRef = useRef(false);
  const busyRef = useRef(false);

  useEffect(() => {
    bkSRef.current = bkS;
  }, [bkS]);
  useEffect(() => {
    bookOpenRef.current = bookOpen;
  }, [bookOpen]);

  const bkGo = (dir: 1 | -1) => {
    if (busyRef.current) return;
    const s = bkSRef.current;
    const n = s + dir;
    if (n < 0 || n > 4) return;
    busyRef.current = true;
    const k = dir > 0 ? s : s - 1;
    bkSRef.current = n;
    setBkS(n);
    setBkFlip(k);
    setBkMax((m) => Math.max(m, n));
    setTimeout(() => {
      busyRef.current = false;
      setBkFlip(-1);
    }, FLIP_DURATION_MS);
  };

  const bkJump = (target: number) => {
    const step = () => {
      const s = bkSRef.current;
      if (s === target) return;
      bkGo(target > s ? 1 : -1);
      setTimeout(step, JUMP_STEP_MS);
    };
    step();
  };

  const openBook = (i: number | null) => {
    bkSRef.current = 0;
    bookOpenRef.current = true;
    setBookOpen(true);
    setBkS(0);
    setBkFlip(-1);
    if (i != null) {
      setCart((prev) => (prev.some((c) => c.i === i) ? prev : [...prev, { i, n: 1, a: [CATALOG_ITEMS[i].areas[0].name] }]));
    }
    document.body.style.overflow = 'hidden';
    if (location.hash !== '#agendar') history.pushState(null, '', '#agendar');
  };

  const closeBook = () => {
    bookOpenRef.current = false;
    setBookOpen(false);
    setPayOpen(false);
    document.body.style.overflow = '';
    if (location.hash === '#agendar') history.pushState(null, '', location.pathname + location.search);
  };

  useEffect(() => {
    const sync = () => {
      const want = location.hash === '#agendar';
      if (want && !bookOpenRef.current) {
        openBook(null);
      } else if (!want && bookOpenRef.current) {
        bookOpenRef.current = false;
        setBookOpen(false);
        setPayOpen(false);
        document.body.style.overflow = '';
      }
    };
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    sync();
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cart mutations
  const updateCart = (fn: (rows: CartLine[]) => CartLine[]) => setCart((rows) => fn(rows.map((r) => ({ ...r, a: [...r.a] }))));
  const incQty = (j: number) => updateCart((rows) => { rows[j].n = Math.min(10, rows[j].n + 1); return rows; });
  const decQty = (j: number) => updateCart((rows) => { rows[j].n = Math.max(1, rows[j].n - 1); return rows; });
  const delLine = (j: number) => setCart((rows) => rows.filter((_, x) => x !== j));
  const addArea = (j: number, area: string) => updateCart((rows) => { rows[j].a = [...rows[j].a, area]; return rows; });
  const removeArea = (j: number, area: string) => updateCart((rows) => { rows[j].a = rows[j].a.filter((x) => x !== area); return rows; });
  const addToCart = (i: number) => setCart((prev) => (prev.some((c) => c.i === i) ? prev : [...prev, { i, n: 1, a: [CATALOG_ITEMS[i].areas[0].name] }]));

  const toggleExtra = (i: number) => setExtraIdx((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const pickDay = (d: number) => {
    setDay(d);
    setTime(null);
  };
  const pickTime = (t: string) => setTime(t);

  // Calendar starts on November 2026; "next/prev month" shifts from there.
  const calYear = BASE_YEAR + Math.floor((BASE_MONTH + monthOffset) / 12);
  const calMonth = ((BASE_MONTH + monthOffset) % 12 + 12) % 12;
  const nextMonth = () => {
    setMonthOffset((m) => m + 1);
    setDay(null);
    setTime(null);
  };
  const prevMonth = () => {
    setMonthOffset((m) => Math.max(0, m - 1));
    setDay(null);
    setTime(null);
  };

  const setPhoneMasked = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 11);
    const v = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
    setPhone(v);
  };

  const total = useMemo(() => {
    const cartTotal = cart.reduce((a, c) => a + lineBreakdown(CATALOG_ITEMS[c.i], c).amount, 0);
    const extrasTotal = extraIdx.reduce((a, i) => a + EXTRAS[i].price, 0);
    return cartTotal + extrasTotal;
  }, [cart, extraIdx]);

  const hasQuoteItem = cart.some((c) => lineBreakdown(CATALOG_ITEMS[c.i], c).hasQuote);

  const ok1 = cart.length > 0 && cart.every((c) => c.a.length > 0);
  const ok2 = day != null && time != null;
  const ok3 = name.trim().length > 1 && phone.replace(/\D/g, '').length >= 10;

  // Payment
  useEffect(() => {
    if (!payOpen || payMethod !== 'pix') return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [payOpen, payMethod]);

  const openPay = () => {
    if (!ok3) return;
    setPayOpen(true);
    setPayMethod('pix');
    setPixStart(Date.now());
    setPayError('');
  };
  const closePay = () => {
    if (!payBusy) setPayOpen(false);
  };
  const pickPayMethod = (m: PayMethod) => {
    setPayMethod(m);
    setPayError('');
    if (m === 'pix') setPixStart(Date.now());
  };

  const setCardNum = (raw: string) => setCardNumState(raw.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '));
  const setCardExpMasked = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 4);
    setCardExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
  };
  const setCardCvvMasked = (raw: string) => setCardCvv(raw.replace(/\D/g, '').slice(0, 4));

  const digits = cardNum.replace(/\D/g, '');
  const cardBrand = /^4/.test(digits)
    ? 'VISA'
    : /^(5[1-5]|2[2-7])/.test(digits)
      ? 'MASTERCARD'
      : /^3[47]/.test(digits)
        ? 'AMEX'
        : /^(636|504|509|650)/.test(digits)
          ? 'ELO'
          : '';

  const pixCopy = () => {
    try {
      navigator.clipboard.writeText(`monalisa-pix-${total}`);
    } catch {
      // clipboard unavailable, ignore
    }
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 1800);
  };

  const paySubmit = () => {
    if (payBusy) return;
    if (payMethod === 'card') {
      const [mm, yy] = cardExp.split('/');
      if (digits.length < 15) return setPayError('Confira o número do cartão.');
      if (cardName.trim().length < 3) return setPayError('Informe o nome impresso no cartão.');
      if (!mm || !yy || +mm < 1 || +mm > 12) return setPayError('Validade inválida (MM/AA).');
      if (cardCvv.length < 3) return setPayError('CVV inválido.');
    }
    setPayBusy(true);
    setPayError('');
    const method = payMethod;
    setTimeout(
      () => {
        setPayBusy(false);
        setPayOpen(false);
        setPaidWith(method);
        setTimeout(() => bkGo(1), 250);
      },
      method === 'local' ? 500 : 1500,
    );
  };

  const bkReset = () => {
    bkJump(0);
    setTimeout(() => {
      setBkMax(0);
      setCart([]);
      setExtraIdx([]);
      setDay(null);
      setTime(null);
      setName('');
      setPhone('');
      setEmail('');
      setNote('');
      setPaidWith(null);
    }, 3200);
  };

  return {
    bookOpen,
    bkS,
    bkFlip,
    bkMax,
    openBook,
    closeBook,
    bkGo,
    bkJump,
    bkReset,

    cart,
    incQty,
    decQty,
    delLine,
    addArea,
    removeArea,
    addToCart,
    ok1,

    extraIdx,
    toggleExtra,

    day,
    time,
    pickDay,
    pickTime,
    ok2,
    calYear,
    calMonth,
    monthOffset,
    nextMonth,
    prevMonth,

    name,
    phone,
    email,
    note,
    setName,
    setPhone: setPhoneMasked,
    setEmail,
    setNote,
    ok3,

    total,
    hasQuoteItem,

    payOpen,
    payMethod,
    pixStart,
    pixCopied,
    cardNum,
    cardName,
    cardExp,
    cardCvv,
    cardInst,
    cardBrand,
    payBusy,
    payError,
    paidWith,
    openPay,
    closePay,
    pickPayMethod,
    setCardNum,
    setCardName,
    setCardExp: setCardExpMasked,
    setCardCvv: setCardCvvMasked,
    setCardInst,
    pixCopy,
    paySubmit,
  };
}

export type BookingFlow = ReturnType<typeof useBookingFlow>;
