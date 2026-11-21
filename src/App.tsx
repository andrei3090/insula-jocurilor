import { ArtSheet } from './screens/dev/ArtSheet';

export function App() {
  if (location.hash === '#art') return <ArtSheet />;
  return (
    <main className="grid h-full place-items-center bg-sky">
      <h1 className="font-display text-5xl font-semibold">Insula Jocurilor</h1>
    </main>
  );
}
