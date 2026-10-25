import { JoinError } from './join-error';

export default function NotFound() {
  return <JoinError message="Kein Tisch mit diesem Code gefunden. Prüf den Code oder lass dir den Link nochmal schicken." />;
}
