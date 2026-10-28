/**
 * Loot-chest ("Truhen") cosmetics: avatar frames, heraldic emblems, card backs and table felts.
 * The art lives in src/components/loot/loot-art.tsx, keyed by the same ids.
 */
export type LootRarity = 'normal' | 'selten' | 'episch' | 'legendaer';
export type LootKind = 'rahmen' | 'wappen' | 'rueckseite' | 'filz';

export interface LootItem {
  id: string;
  kind: LootKind;
  rarity: LootRarity;
  name: string;
  nameEn: string;
  text: string;
}

export const RARITY_ORDER: LootRarity[] = ['normal', 'selten', 'episch', 'legendaer'];

export const RARITY_LABEL: Record<LootRarity, string> = {
  normal: 'Gewöhnlich',
  selten: 'Selten',
  episch: 'Episch',
  legendaer: 'Legendär',
};

export const RARITY_COLOR: Record<LootRarity, string> = {
  normal: '#b8a7c8',
  selten: '#5b8def',
  episch: '#b46ef0',
  legendaer: '#f4b73a',
};

/** Relative drop weights when a chest is opened. */
export const RARITY_WEIGHT: Record<LootRarity, number> = { normal: 60, selten: 28, episch: 10, legendaer: 2 };

export const KIND_LABEL: Record<LootKind, string> = {
  rahmen: 'Rahmen',
  wappen: 'Wappen',
  rueckseite: 'Kartenrücken',
  filz: 'Tischfilz',
};

export const LOOT_VIEWBOX: Record<LootKind, string> = {
  rahmen: '0 0 100 100',
  wappen: '0 0 100 100',
  rueckseite: '0 0 100 140',
  filz: '0 0 160 100',
};

type Row = [slug: string, rarity: LootRarity, name: string, nameEn: string, text: string];

const RAHMEN: Row[] = [
  ['holzreif', 'normal', 'Holzreif', 'Wooden Hoop', 'Aus dem Fassdeckel der Hofschenke gedrechselt.'],
  ['eisenring', 'normal', 'Eisenring', 'Iron Ring', 'Genietet vom Burgschmied, unverwüstlich wie sein Humor.'],
  ['kordel', 'normal', 'Hanfkordel', 'Twisted Rope', 'Hält zusammen, was der Hofnarr auseinanderbringt.'],
  ['perlen', 'normal', 'Perlenschnur', 'String of Pearls', 'Jede Perle ein gewonnener Stich.'],
  ['efeu', 'normal', 'Efeuranke', 'Ivy Vine', 'Wächst still an alten Burgmauern empor.'],
  ['siegelwachs', 'normal', 'Siegelwachs', 'Sealing Wax', 'Versiegelt mit dem roten Wachs der Kanzlei.'],
  ['schachbrett', 'normal', 'Schachbrettring', 'Chequered Ring', 'Schwarz und Weiß, wie Bauer und König.'],
  ['mondphasen', 'normal', 'Mondphasen', 'Moon Phases', 'Vom Neumond bis zum Vollmond wird gespielt.'],
  ['narrenschellen', 'normal', 'Narrenschellen', "Jester's Bells", 'Klingelt bei jedem Zug ein bisschen zu laut.'],
  ['kupferband', 'normal', 'Kupferband', 'Copper Band', 'Glänzt warm im Schein der Kaminfeuer.'],
  ['weide', 'normal', 'Weidengeflecht', 'Wicker Weave', 'Geflochten von den Korbmachern des Dorfes.'],
  ['runen', 'normal', 'Runenkreis', 'Rune Circle', 'Alte Zeichen, die niemand mehr lesen kann.'],
  ['lorbeer', 'selten', 'Silberlorbeer', 'Silver Laurel', 'Lorbeer für Sieger, Silber für Bescheidene.'],
  ['dornenrose', 'selten', 'Dornenrose', 'Thorned Rose', 'Schön anzusehen, schmerzhaft zu pflücken.'],
  ['eiskristall', 'selten', 'Eiskristall', 'Ice Crystal', 'Kalt wie der Blick des Großen Jakob.'],
  ['flammen', 'selten', 'Flammenkranz', 'Ring of Flames', 'Für Spieler, die mit dem Feuer spielen.'],
  ['ketten', 'selten', 'Kerkerkette', 'Dungeon Chain', 'Der Schlüssel liegt beim Kerkermeister.'],
  ['lebensstern', 'selten', 'Stern des Lebens', 'Star of Life', 'Für alle, die ausrücken, wenn es brennt.'],
  ['sonnenrad', 'selten', 'Sonnenrad', 'Sunwheel', 'Strahlt wie ein Morgen nach dem Sieg.'],
  ['buntglas', 'selten', 'Buntglasfenster', 'Stained Glass', 'Das Licht der Kapelle in allen Farben.'],
  ['filigran', 'selten', 'Silberfiligran', 'Silver Filigree', 'Feinste Drahtarbeit aus der Hofschmiede.'],
  ['juwelen', 'episch', 'Juwelenfassung', 'Jewel Setting', 'Acht Edelsteine aus der königlichen Schatzkammer.'],
  ['drachenschuppe', 'episch', 'Drachenschuppe', 'Dragon Scale', 'Jede Schuppe härter als Ritterstahl.'],
  ['sternennacht', 'episch', 'Sternennacht', 'Starry Night', 'Ein Stück Nachthimmel über dem Thronsaal.'],
  ['greifenschwingen', 'episch', 'Greifenschwingen', 'Griffin Wings', 'Getragen von den Schwingen des Greifen.'],
  ['amethystkrone', 'episch', 'Amethystkrone', 'Amethyst Crown', 'Purpur gebührt nur dem Hofstaat.'],
  ['korallen', 'episch', 'Tiefseekoralle', 'Abyssal Coral', 'Vom Grund des Meeres, wo die Kraken wohnen.'],
  ['drachenkoenig', 'legendaer', 'Drachenkönig', 'Dragon King', 'Der Drache bewacht nur, was ihm gehört.'],
  ['phoenix', 'legendaer', 'Phönixglut', 'Phoenix Blaze', 'Aus der Asche jeder Niederlage neu erhoben.'],
  ['jakobskrone', 'legendaer', 'Krone des Großen Jakob', 'Crown of the Great Jakob', 'Nur einer trägt sie. Heute bist du es.'],
];

const WAPPEN: Row[] = [
  ['turm', 'normal', 'Burgturm', 'Castle Tower', 'Fest gemauert, nie gefallen.'],
  ['schluessel', 'normal', 'Kerkerschlüssel', 'Dungeon Key', 'Wer ihn trägt, kommt überall hinein.'],
  ['eule', 'normal', 'Weise Eule', 'Wise Owl', 'Sieht jeden Bluff, auch im Dunkeln.'],
  ['hirsch', 'normal', 'Stolzer Hirsch', 'Proud Stag', 'König des Waldes, Gast am Hofe.'],
  ['kogge', 'normal', 'Kogge', 'Cog Ship', 'Segelt mit vollem Laderaum nach Hause.'],
  ['lilie', 'normal', 'Goldene Lilie', 'Golden Lily', 'Das älteste Zeichen des Adels.'],
  ['sonne', 'normal', 'Sonnenschild', 'Sun Shield', 'Wo sie scheint, hat niemand schlechte Karten.'],
  ['mond', 'normal', 'Mondsichel', 'Crescent Moon', 'Für Nachteulen am Spieltisch.'],
  ['kelch', 'normal', 'Hofkelch', 'Court Chalice', 'Auf den Sieger! Und auf den Verlierer!'],
  ['rabe', 'normal', 'Rabe', 'Raven', 'Bringt Neuigkeiten, meist schlechte.'],
  ['anker', 'normal', 'Anker', 'Anchor', 'Hält Kurs, auch bei Revolutionen.'],
  ['eiche', 'normal', 'Alte Eiche', 'Old Oak', 'Tausend Jahre Wurzeln, kein Zweifel.'],
  ['loewe', 'selten', 'Löwenhaupt', "Lion's Head", 'Brüllt erst, wenn der Stich sicher ist.'],
  ['schwerter', 'selten', 'Gekreuzte Schwerter', 'Crossed Swords', 'Silberklingen mit goldenen Griffen.'],
  ['narr', 'selten', 'Narrenschädel', "Jester's Skull", 'Der letzte Narr lacht noch immer.'],
  ['wolf', 'selten', 'Grauwolf', 'Grey Wolf', 'Jagt im Rudel, gewinnt allein.'],
  ['lebensstern', 'selten', 'Retterwappen', "Rescuer's Arms", 'Der blaue Stern für die Retter des Reiches.'],
  ['falke', 'selten', 'Jagdfalke', 'Hunting Falcon', 'Stößt herab, sobald ein König fällt.'],
  ['springer', 'selten', 'Springer', 'Knight', 'Springt immer dorthin, wo keiner rechnet.'],
  ['salm', 'selten', 'Silberlachs', 'Silver Salmon', 'Schwimmt stets gegen den Strom.'],
  ['harfe', 'selten', 'Hofharfe', 'Court Harp', 'Spielt die Melodie zum Sieg.'],
  ['greif', 'episch', 'Greif', 'Griffin', 'Halb Adler, halb Löwe, ganz Adel.'],
  ['einhorn', 'episch', 'Einhorn', 'Unicorn', 'So selten wie ein ehrlicher Bluff.'],
  ['lindwurm', 'episch', 'Lindwurm', 'Wyvern', 'Haust in den Höhlen unter der Burg.'],
  ['krake', 'episch', 'Krake', 'Kraken', 'Greift mit acht Armen nach allen Karten.'],
  ['astrolabium', 'episch', 'Astrolabium', 'Astrolabe', 'Die Sterne sagen deinen Sieg voraus.'],
  ['schwan', 'episch', 'Schwanenritter', 'Swan Knight', 'Edel auf dem Wasser, wild darunter.'],
  ['phoenix', 'legendaer', 'Phönix', 'Phoenix', 'Verbrennt und kehrt strahlender zurück.'],
  ['golddrache', 'legendaer', 'Golddrache', 'Golden Dragon', 'Schläft auf Gold und träumt von Kronen.'],
  ['grosser-jakob', 'legendaer', 'Wappen des Großen Jakob', 'Arms of the Great Jakob', 'Das höchste Wappen am ganzen Hofe.'],
];

const RUECKSEITE: Row[] = [
  ['rauten', 'normal', 'Rautengitter', 'Diamond Lattice', 'Das klassische Muster der Hofkartenmacher.'],
  ['streifen', 'normal', 'Hofstreifen', 'Court Stripes', 'Schräg gestreift wie die Hosen der Pagen.'],
  ['schachbrett', 'normal', 'Schachbrett', 'Chequerboard', 'Ein Spiel im Spiel.'],
  ['tupfen', 'normal', 'Samttupfen', 'Velvet Dots', 'Getupft wie der Mantel der Herzogin.'],
  ['wellen', 'normal', 'Burggraben', 'Moat Waves', 'Wellen aus dem Graben rund um die Burg.'],
  ['schuppen', 'normal', 'Fischschuppen', 'Fish Scales', 'Frisch vom Markt, glänzend wie Silber.'],
  ['sternenzelt', 'normal', 'Sternenzelt', 'Starry Tent', 'Wie das Zelt der Gaukler auf dem Jahrmarkt.'],
  ['tartan', 'normal', 'Hochlandkaro', 'Highland Tartan', 'Gewebt von den Clans aus dem Norden.'],
  ['mauer', 'normal', 'Burgmauer', 'Castle Wall', 'Stein auf Stein, keiner schaut dahinter.'],
  ['zickzack', 'normal', 'Zickzack', 'Zigzag', 'So unberechenbar wie der Hofnarr.'],
  ['kreuze', 'normal', 'Ritterkreuze', "Knights' Crosses", 'Ein Kreuz für jeden tapferen Ritter.'],
  ['lilien', 'selten', 'Lilienfeld', 'Field of Lilies', 'Goldene Lilien auf königlichem Blau.'],
  ['arabeske', 'selten', 'Arabeske', 'Arabesque', 'Verschlungen wie die Ränke am Hofe.'],
  ['rosette', 'selten', 'Rosette', 'Rose Window', 'Das große Fenster über dem Kirchenportal.'],
  ['strahlenkranz', 'selten', 'Strahlenkranz', 'Sunburst', 'Strahlen aus Gold auf tiefem Purpur.'],
  ['lebensstern', 'selten', 'Rettungswache', 'Rescue Station', 'Rot-weiß gewarnt, blau gerettet.'],
  ['windrose', 'selten', 'Windrose', 'Compass Rose', 'Zeigt in jede Himmelsrichtung zum Sieg.'],
  ['harlekin', 'selten', 'Harlekin', 'Harlequin', 'Bunte Rauten für den Hofnarren.'],
  ['eichenlaub', 'selten', 'Eichenlaub', 'Oak Leaves', 'Laub und Eicheln aus dem Königsforst.'],
  ['drachenschuppe', 'episch', 'Drachenschuppe', 'Dragon Scale', 'Ein Drachenauge wacht über deine Karten.'],
  ['sternbilder', 'episch', 'Sternbilder', 'Constellations', 'Die Sterndeuter haben hier gezeichnet.'],
  ['kathedrale', 'episch', 'Kathedrale', 'Cathedral', 'Spitzbögen und Buntglas im Abendlicht.'],
  ['schatzkammer', 'episch', 'Schatzkammer', 'Treasury', 'Jede Raute ein geschliffener Edelstein.'],
  ['tiefsee', 'episch', 'Tiefsee', 'Abyss', 'Aus der Tiefe greift der Krake.'],
  ['phoenix', 'legendaer', 'Phönixfeder', 'Phoenix Feather', 'Glühend, golden, unsterblich.'],
  ['thron', 'legendaer', 'Thron des Jakob', "Jakob's Throne", 'Der Rücken jeder Karte des Großen Jakob.'],
];

const FILZ: Row[] = [
  ['gruen', 'normal', 'Spieltischgrün', 'Card-Table Green', 'Das gute alte Grün der Tavernen.'],
  ['weinrot', 'normal', 'Weinkeller', 'Wine Cellar', 'Riecht leicht nach verschüttetem Rotwein.'],
  ['mitternacht', 'normal', 'Mitternachtsblau', 'Midnight Blue', 'Für Partien, die bis in die Nacht gehen.'],
  ['schiefer', 'normal', 'Schiefer', 'Slate', 'Kühl und grau wie das Burgdach.'],
  ['moos', 'normal', 'Moosgrund', 'Moss', 'Weich wie der Waldboden im Frühling.'],
  ['taverne', 'normal', 'Tavernentisch', 'Tavern Table', 'Hier wird gewürfelt, gespielt und gestritten.'],
  ['purpur', 'normal', 'Hofpurpur', 'Court Purple', 'Die Farbe des Thronsaals bei Nacht.'],
  ['seegras', 'normal', 'Seegras', 'Seagrass', 'Ruhig wie die Bucht vor dem Hafen.'],
  ['herbst', 'normal', 'Herbstlaub', 'Autumn Leaves', 'Warm und golden wie ein Oktoberabend.'],
  ['damast', 'selten', 'Roter Damast', 'Red Damask', 'Gewebt in den Werkstätten der Königin.'],
  ['silberborte', 'selten', 'Silberborte', 'Silver Braid', 'Königsblau mit feiner Silberkante.'],
  ['sternenfeld', 'selten', 'Sternenfeld', 'Star Field', 'Spielen unter freiem Himmel.'],
  ['lilienborte', 'selten', 'Lilienborte', 'Lily Border', 'Goldene Lilien wachen in jeder Ecke.'],
  ['leitstelle', 'selten', 'Leitstelle', 'Dispatch Centre', 'Ruhe bewahren, Karten ausspielen.'],
  ['jagdgruen', 'selten', 'Jagdgrün', 'Hunting Green', 'Eichenlaub aus dem Jagdschloss.'],
  ['drachenhort', 'episch', 'Drachenhort', "Dragon's Hoard", 'Gespielt wird auf dem Gold des Drachen.'],
  ['nordlicht', 'episch', 'Nordlicht', 'Northern Lights', 'Der Himmel tanzt über dem Spieltisch.'],
  ['amethystsaal', 'episch', 'Amethystsaal', 'Amethyst Hall', 'Violett schimmernd, mit Juwelen besetzt.'],
  ['thronsaal', 'legendaer', 'Thronsaal', 'Throne Room', 'Der Tisch, an dem der Große Jakob regiert.'],
  ['phoenixnest', 'legendaer', 'Phönixnest', "Phoenix's Nest", 'Glut unter den Karten, Gold an den Rändern.'],
];

const build = (kind: LootKind, rows: Row[]): LootItem[] =>
  rows.map(([slug, rarity, name, nameEn, text]) => ({ id: `${kind}-${slug}`, kind, rarity, name, nameEn, text }));

export const LOOT_ITEMS: LootItem[] = [
  ...build('rahmen', RAHMEN),
  ...build('wappen', WAPPEN),
  ...build('rueckseite', RUECKSEITE),
  ...build('filz', FILZ),
];

export const LOOT_BY_ID: Record<string, LootItem> = Object.fromEntries(LOOT_ITEMS.map((item) => [item.id, item]));
