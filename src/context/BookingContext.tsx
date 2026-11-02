import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useBookingFlow } from '../hooks/useBookingFlow';
import type { BookingFlow } from '../hooks/useBookingFlow';

const BookingContext = createContext<BookingFlow | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const flow = useBookingFlow();
  return <BookingContext.Provider value={flow}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingFlow {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within a BookingProvider');
  return ctx;
}

/** Adapt page navigation on narrow screens while sharing the same booking state. */
export function BookingPageNavigation({ children, onNavigate, onJump }: {
  children: ReactNode;
  onNavigate: BookingFlow['bkGo'];
  onJump: BookingFlow['bkJump'];
}) {
  const flow = useBooking();
  return <BookingContext.Provider value={{ ...flow, bkGo: onNavigate, bkJump: onJump }}>{children}</BookingContext.Provider>;
}
