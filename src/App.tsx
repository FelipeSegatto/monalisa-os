import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Welcome } from './components/Welcome';
import { Catalog } from './components/Catalog';
import { MonalisaBanner } from './components/MonalisaBanner';
import { Devices } from './components/Devices';
import { DemoBadge } from './components/DemoBadge';
import { BookingProvider } from './context/BookingContext';
import { BookingOverlay } from './components/booking/BookingOverlay';

function App() {
  return (
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
      <DemoBadge />
    </BookingProvider>
  );
}

export default App;
