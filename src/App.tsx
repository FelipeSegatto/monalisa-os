import { AccountProvider } from './context/AccountProvider';
import { AccountModal } from './components/account/AccountModal';
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
  return (
    <AccountProvider>
      <BookingProvider>
        <div className="page">
          <Nav />
          <Hero />
          <Welcome />
          <Catalog />
          <MonalisaBanner />
          <Devices />
          <Footer />
        </div>
        <BookingOverlay />
        <AccountModal />
        <DemoBadge />
      </BookingProvider>
    </AccountProvider>
  );
}

export default App;