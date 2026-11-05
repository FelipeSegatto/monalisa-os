import { useState } from 'react';
import { AccountProvider } from './context/AccountProvider';
import { AccountModal } from './components/account/AccountModal';
import { Intro } from './components/Intro';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Welcome } from './components/Welcome';
import { Catalog } from './components/Catalog';
import { MonalisaBanner } from './components/MonalisaBanner';
import { Devices } from './components/Devices';
import { Footer } from './components/Footer';
import { DemoBadge } from './components/DemoBadge';
import { BookingProvider } from './context/BookingContext';
import { BookingOverlay } from './components/booking/BookingOverlay';

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [introEndedAt, setIntroEndedAt] = useState<number | null>(null);
  return (
    <AccountProvider>
      <BookingProvider>
        <div className="page">
          <Nav />
          <Hero introEndedAt={introEndedAt} />
          <Welcome />
          <Catalog />
          <MonalisaBanner />
          <Devices />
          <Footer />
        </div>
        <BookingOverlay />
        <AccountModal />
        <DemoBadge />
        {showIntro && <Intro onDone={() => { setIntroEndedAt(Date.now()); setShowIntro(false); }} />}
      </BookingProvider>
    </AccountProvider>
  );
}

export default App;