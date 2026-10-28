/**
 * The computer players as characters (like the bots on chess.com): every persona has a portrait,
 * a strength, a playing style and a few lines it says at the table. The Elo is measured, not guessed:
 * calibrate.test.ts plays 200 games per persona against the plain "sly" bot (1150 on the player
 * scale) and converts the score into a rating.
 */

/** How a persona plays; all values 0–1. See brain.ts for how they are used. */
export interface BotStyle {
  /** Planning: counts cards, keeps groups together, knows which sets still can be beaten. */
  skill: number;
  /** Chance of a careless move. */
  blunder: number;
  /** Holds strong cards back for later instead of spending them early. */
  patience: number;
  /** Fights for tricks instead of passing. */
  aggression: number;
}

export type QuipMoment = 'greet' | 'crown' | 'servant' | 'bomb' | 'revolution' | 'win' | 'lose';

export interface Persona {
  id: string;
  /** Untranslated name: also the key of the portrait (lib/bot-art.ts). */
  name: string;
  emoji: string;
  /** Office at court, shown under the name. */
  title: string;
  elo: number;
  /** One sentence about the character. */
  bio: string;
  style: BotStyle;
  quips: Record<QuipMoment, string[]>;
  /** Shown first in the bot gallery ("Ehrengäste"). */
  featured?: boolean;
}

export const PERSONAS: Persona[] = [
  {
    id: 'bernd', name: 'Bauer Bernd', emoji: '👨‍🌾', title: 'Bauer', elo: 1040,
    bio: 'Spielt, wie er pflügt: geradeaus und ohne viel nachzudenken.',
    style: { skill: 0, blunder: 0.35, patience: 0.1, aggression: 0.6 },
    quips: {
      greet: ['Na, dann wolln wir mal.', 'Ich hab noch Kühe zu melken, also los!'],
      crown: ['Heute ernte ich!', 'Sowas wächst nur auf meinem Acker.'],
      servant: ['Mist, schon wieder.', 'Da hat der Hagel zugeschlagen.'],
      bomb: ['Da staunst du, was?'],
      revolution: ['Nieder mit den Herren!'],
      win: ['Gewonnen! Das erzähl ich im ganzen Dorf.'],
      lose: ['Gut gespielt. Ich geh zurück aufs Feld.'],
    },
  },
  {
    id: 'sina', name: 'Schäferin Sina', emoji: '🐑', title: 'Schäferin', elo: 1060,
    bio: 'Freundlich und geduldig – nur das Zählen überlässt sie lieber den Schafen.',
    style: { skill: 0.1, blunder: 0.3, patience: 0.6, aggression: 0.3 },
    quips: {
      greet: ['Schön, dass du da bist!', 'Die Herde wartet, aber ein Spiel geht immer.'],
      crown: ['Oh! Ich bin ganz oben?', 'Mäh-gnifique!'],
      servant: ['Ach, macht nichts.', 'Dann eben nächstes Mal.'],
      bomb: ['Hoppla, die gehörten alle zusammen.'],
      revolution: ['Die Schafe sind sich einig!'],
      win: ['Wie schön! Danke fürs Spiel.'],
      lose: ['Du warst besser. Gut gemacht!'],
    },
  },
  {
    id: 'hugo', name: 'Hofnarr Hugo', emoji: '🤹', title: 'Hofnarr', elo: 1030,
    bio: 'Unberechenbar wie ein Würfelwurf. Manchmal genial, meistens verrückt.',
    style: { skill: 0.15, blunder: 0.3, patience: 0.2, aggression: 0.9 },
    quips: {
      greet: ['Tri-tra-trulala, der Hugo ist da!', 'Heute spiele ich mit geschlossenen Augen.'],
      crown: ['Ein Narr auf dem Thron! Ha!', 'Verbeugt euch vor König Hugo!'],
      servant: ['Unten ist auch lustig.', 'Hoppla, falsch herum gesessen.'],
      bomb: ['Bumm! Ha-ha!', 'Überraschung!'],
      revolution: ['Alles auf den Kopf! Mein Lieblingsspiel!'],
      win: ['Der Narr gewinnt – wer hätte das gedacht?'],
      lose: ['Ach, lachen ist sowieso wichtiger.'],
    },
  },
  {
    id: 'klara', name: 'Köchin Klara', emoji: '👩‍🍳', title: 'Köchin', elo: 1100,
    bio: 'Kocht und spielt nach Gefühl – eine Prise hier, eine Handvoll da.',
    style: { skill: 0.25, blunder: 0.22, patience: 0.4, aggression: 0.55 },
    quips: {
      greet: ['Das Essen ist im Ofen – wir haben Zeit für eine Partie.'],
      crown: ['Das ist mir gut gelungen!', 'Perfekt gewürzt.'],
      servant: ['Angebrannt.', 'Das Rezept muss ich noch üben.'],
      bomb: ['Alles in einen Topf!'],
      revolution: ['Die Küche hat genug!'],
      win: ['Zum Nachtisch gibt es einen Sieg.'],
      lose: ['Na gut, du hast heute den Löffel abgegeben … ich meine, gewonnen.'],
    },
  },
  {
    id: 'nora', name: 'Näherin Nora', emoji: '🧵', title: 'Näherin', elo: 1110,
    bio: 'Sorgfältig, Stich für Stich. Ihr fehlt nur noch der große Plan.',
    style: { skill: 0.35, blunder: 0.18, patience: 0.5, aggression: 0.45 },
    quips: {
      greet: ['Fädeln wir ein.'],
      crown: ['Sitzt wie angegossen.', 'Saubere Naht.'],
      servant: ['Da ist mir der Faden gerissen.'],
      bomb: ['Vier auf einen Streich!'],
      revolution: ['Wir nähen uns neue Kleider – für alle!'],
      win: ['Fein säuberlich gewonnen.'],
      lose: ['Da muss ich wohl noch einmal nachbessern.'],
    },
  },
  {
    id: 'stefan', name: 'Steinmetz Stefan', emoji: '⛏️', title: 'Steinmetz', elo: 1170,
    bio: 'Baut seine Hand Stein auf Stein. Langsam, aber solide.',
    style: { skill: 0.45, blunder: 0.15, patience: 0.65, aggression: 0.35 },
    quips: {
      greet: ['Ein festes Fundament, dann sehen wir weiter.'],
      crown: ['Wie gemeißelt.', 'Das hält hundert Jahre.'],
      servant: ['Da war ein Riss im Stein.'],
      bomb: ['Felsbrocken!'],
      revolution: ['Wir reißen die Mauern ein!'],
      win: ['Stein auf Stein – und oben die Krone.'],
      lose: ['Der Mörtel war noch nicht trocken.'],
    },
  },
  {
    id: 'matthias', name: 'Mönch Matthias', emoji: '🧙', title: 'Mönch', elo: 1190,
    bio: 'Schweigt viel, wartet lange und schlägt im richtigen Moment zu.',
    style: { skill: 0.5, blunder: 0.12, patience: 0.9, aggression: 0.2 },
    quips: {
      greet: ['Der Herr sei mit dir. Und mit meinen Karten.'],
      crown: ['Geduld ist eine Tugend.', 'Wer wartet, wird erhöht.'],
      servant: ['Demut tut gut.'],
      bomb: ['Ein Zeichen des Himmels.'],
      revolution: ['Die Letzten werden die Ersten sein.'],
      win: ['Gelobt sei die Geduld.'],
      lose: ['Ich werde für dich beten. Du hast es verdient.'],
    },
  },
  {
    id: 'ruediger', name: 'Ritter Rüdiger', emoji: '🛡️', title: 'Ritter', elo: 1150,
    bio: 'Stürmt in jeden Stich. Mut hat er genug, Vorsicht weniger.',
    style: { skill: 0.55, blunder: 0.1, patience: 0.15, aggression: 1 },
    quips: {
      greet: ['Zieh dein Schwert – äh, deine Karten!'],
      crown: ['Für König und Vaterland!', 'Der Sieg gehört den Mutigen!'],
      servant: ['Ein Ritter kennt keine Niederlage. Nur Rückzüge.'],
      bomb: ['Attacke!', 'Zum Angriff!'],
      revolution: ['Ein Ritter dient dem Volk!'],
      win: ['Ehre und Ruhm!'],
      lose: ['Ein ehrenvoller Kampf. Ich verneige mich.'],
    },
  },
  {
    id: 'berta', name: 'Baronin Berta', emoji: '💎', title: 'Baronin', elo: 1210,
    bio: 'Gibt ungern etwas her – am wenigsten ihre guten Karten.',
    style: { skill: 0.6, blunder: 0.08, patience: 0.85, aggression: 0.35 },
    quips: {
      greet: ['Wie reizend. Setz dich doch.'],
      crown: ['Selbstverständlich.', 'Wo sonst sollte ich sitzen?'],
      servant: ['Wie unerhört!', 'Das wird Folgen haben.'],
      bomb: ['Ein kleines Juwel aus meiner Sammlung.'],
      revolution: ['Ausnahmsweise – für den guten Zweck.'],
      win: ['Wie erwartet.'],
      lose: ['Na schön. Genieß es, solange es dauert.'],
    },
  },
  {
    id: 'gisela', name: 'Gräfin Gisela', emoji: '👸', title: 'Gräfin', elo: 1220,
    bio: 'Elegant und berechnend. Sie merkt sich, welche Karten schon gefallen sind.',
    style: { skill: 0.7, blunder: 0.07, patience: 0.6, aggression: 0.5 },
    quips: {
      greet: ['Ich hoffe, du hast geübt.'],
      crown: ['Der Thron steht mir.', 'Wie angenehm.'],
      servant: ['Ein vorübergehender Zustand.'],
      bomb: ['Damit hast du nicht gerechnet.'],
      revolution: ['Manchmal muss man die Ordnung neu sortieren.'],
      win: ['Ein vergnüglicher Abend.'],
      lose: ['Beeindruckend. Wirklich.'],
    },
  },
  {
    id: 'egon', name: 'Erzbischof Egon', emoji: '⛪', title: 'Erzbischof', elo: 1200,
    bio: 'Kennt jede Regel und jede Karte. Seine Predigten sind kurz, seine Züge klug.',
    style: { skill: 0.78, blunder: 0.06, patience: 0.7, aggression: 0.45 },
    quips: {
      greet: ['Lasset uns beginnen.'],
      crown: ['So steht es geschrieben.', 'Amen.'],
      servant: ['Eine Prüfung des Herrn.'],
      bomb: ['Das Jüngste Gericht!'],
      revolution: ['Die Kirche steht beim Volk.'],
      win: ['Gesegnet seien die Klugen.'],
      lose: ['Du hast mich gelehrt, demütig zu sein.'],
    },
  },
  {
    id: 'max', name: 'Marschall Max', emoji: '🎖️', title: 'Marschall', elo: 1250,
    bio: 'Plant jede Runde wie einen Feldzug: erst die Schwachen, dann der Vorstoß.',
    style: { skill: 0.82, blunder: 0.05, patience: 0.55, aggression: 0.7 },
    quips: {
      greet: ['Stellung beziehen!', 'Die Schlacht beginnt.'],
      crown: ['Mission erfüllt.', 'Wie geplant.'],
      servant: ['Taktischer Rückzug.'],
      bomb: ['Volle Breitseite!'],
      revolution: ['Die Truppen meutern – mit meinem Segen.'],
      win: ['Sieg auf ganzer Linie.'],
      lose: ['Respekt. Du hättest einen guten General abgegeben.'],
    },
  },
  {
    id: 'ali', name: 'Leibwächter Ali', emoji: '💂', title: 'Leibwächter', elo: 1280, featured: true,
    bio: 'Steht wie eine Mauer. Wer an ihm vorbei will, braucht die richtigen Karten.',
    style: { skill: 0.86, blunder: 0.04, patience: 0.75, aggression: 0.8 },
    quips: {
      greet: ['Ich behalte dich im Auge.', 'Keine Sorge, ich beiße nur beim Spielen.'],
      crown: ['Bewacht und gesichert.', 'Niemand kommt hier vorbei.'],
      servant: ['Kurz unaufmerksam. Passiert nicht wieder.'],
      bomb: ['Durchbruch!'],
      revolution: ['Ich schütze jetzt das Volk.'],
      win: ['Auftrag erledigt.'],
      lose: ['Starke Leistung. Du kommst durch jede Wache.'],
    },
  },
  {
    id: 'maxi', name: 'Wissenschaftlerin Maxi', emoji: '🔭', title: 'Wissenschaftlerin', elo: 1290, featured: true,
    bio: 'Rechnet Wahrscheinlichkeiten schneller aus, als du deine Karten sortierst.',
    style: { skill: 0.92, blunder: 0.03, patience: 0.6, aggression: 0.6 },
    quips: {
      greet: ['Interessant. Lass uns ein Experiment machen.', 'Ich habe die Wahrscheinlichkeiten schon berechnet.'],
      crown: ['Wie berechnet.', 'Die Daten lügen nicht.'],
      servant: ['Statistisch gesehen musste das mal passieren.'],
      bomb: ['Kettenreaktion!'],
      revolution: ['Ein faszinierender Umsturz!'],
      win: ['Hypothese bestätigt.'],
      lose: ['Ein Ausreißer in meinen Daten. Faszinierend.'],
    },
  },
  {
    id: 'paul', name: 'Hofmeister Paul', emoji: '🗝️', title: 'Hofmeister', elo: 1310, featured: true,
    bio: 'Führt den Hof mit eiserner Ordnung – und seine Hand ebenso.',
    style: { skill: 0.95, blunder: 0.02, patience: 0.7, aggression: 0.65 },
    quips: {
      greet: ['Alles hat seine Ordnung. Auch deine Niederlage.', 'Bitte Platz nehmen.'],
      crown: ['Ordnungsgemäß.', 'Wie es sich gehört.'],
      servant: ['Ein Verwaltungsfehler.'],
      bomb: ['Vier Schlüssel für ein Schloss.'],
      revolution: ['Ich ordne den Hof neu.'],
      win: ['Der Hof ist wieder in Ordnung.'],
      lose: ['Das notiere ich mir. Sehr gut gespielt.'],
    },
  },
  {
    id: 'charlotta', name: 'Gräfin Charlotta', emoji: '🪭', title: 'Gräfin', elo: 1330, featured: true,
    bio: 'Lächelt freundlich, während sie dich in die Falle lockt. Die beste Strategin am Hof.',
    style: { skill: 0.97, blunder: 0.01, patience: 0.8, aggression: 0.6 },
    quips: {
      greet: ['Wie schön, ein neues Spielzeug.', 'Ich freue mich so auf unser Spiel.'],
      crown: ['Hast du wirklich etwas anderes erwartet?', 'Merci.'],
      servant: ['Nur ein Schachzug, Liebes.'],
      bomb: ['Oh, das muss wehtun.'],
      revolution: ['Wie amüsant – alles neu gemischt.'],
      win: ['Danke für das reizende Spiel.'],
      lose: ['Du überraschst mich. Das gefällt mir.'],
    },
  },
  {
    id: 'nikita', name: 'Hinterwäldler Nikita', emoji: '🪓', title: 'Hinterwäldler', elo: 1280, featured: true,
    bio: 'Kommt aus den tiefsten Wäldern, spaltet Holzklötze mit einer Hand – und Stiche mit der anderen.',
    style: { skill: 0.88, blunder: 0.03, patience: 0.3, aggression: 0.95 },
    quips: {
      greet: ['Frisch aus dem Wald – und hungrig auf Stiche!', 'Ich hab Bäume gefällt, die größer waren als dein Blatt.'],
      crown: ['Mit bloßen Händen erobert!', 'Das war ein kräftiger Hieb.'],
      servant: ['Nur ein Kratzer.', 'Dann hack ich mich eben wieder nach oben.'],
      bomb: ['Baum fällt!', 'Holz vor der Hütte!'],
      revolution: ['Aus dem Wald gegen die Burg!'],
      win: ['Das gibt heute Abend ein großes Feuer!'],
      lose: ['Starke Arme helfen nicht immer. Gut gespielt!'],
    },
  },
  {
    id: 'peschel', name: 'König Peschel', emoji: '👑', title: 'König', elo: 1350, featured: true,
    bio: 'Der König selbst. Er hat jedes Spiel am Hof gewonnen – fast jedes.',
    style: { skill: 1, blunder: 0, patience: 0.75, aggression: 0.7 },
    quips: {
      greet: ['Ihr wagt es, den König herauszufordern?', 'Setzt Euch. Der König spielt.'],
      crown: ['Die Krone kehrt heim.', 'Wie es sein soll.'],
      servant: ['Ein König steht immer wieder auf.', 'Genießt es. Es wird nicht lange dauern.'],
      bomb: ['Der König spricht!'],
      revolution: ['Ein König kann auch vom Volk her regieren.'],
      win: ['Lang lebe der König.'],
      lose: ['Ihr habt den König besiegt. Kniet nieder – zum Ritterschlag.'],
    },
  },
];

export const PERSONA_BY_ID: Record<string, Persona> = Object.fromEntries(PERSONAS.map((p) => [p.id, p]));
export const PERSONA_IDS = PERSONAS.map((p) => p.id);

/** Strength groups for the bot gallery. */
export const PERSONA_TIERS = ['Anfänger', 'Fortgeschritten', 'Meister', 'Königlich'] as const;
export type PersonaTier = (typeof PERSONA_TIERS)[number];

export function personaTier(elo: number): PersonaTier {
  if (elo >= 1300) return 'Königlich';
  if (elo >= 1200) return 'Meister';
  if (elo >= 1100) return 'Fortgeschritten';
  return 'Anfänger';
}
