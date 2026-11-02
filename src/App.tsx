import { AccountProvider } from './context/AccountProvider';
import { AccountModal } from './components/account/AccountModal';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Welcome } from './components/Welcome';
import { Catalog } from './components/Catalog';
import { MonalisaBanner } from './components/MonalisaBanner';
import { Devices } from './components/Devices';
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
        </div>
        <BookingOverlay />
        <AccountModal />
      </BookingProvider>
    </AccountProvider>
  );
}

export default App;
