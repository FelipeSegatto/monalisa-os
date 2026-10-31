import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Welcome } from './components/Welcome';
import { Catalog } from './components/Catalog';
import { MonalisaBanner } from './components/MonalisaBanner';
import { Devices } from './components/Devices';

function App() {
  return (
    <div className="page">
      <Nav />
      <Hero />
      <Welcome />
      <Catalog />
      <MonalisaBanner />
      <Devices />
    </div>
  );
}

export default App;
