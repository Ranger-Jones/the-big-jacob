/** Portrait art ids of the computer players (drawn in components/deck/bot-portraits.tsx), keyed by bot name. */
export const BOT_ART_IDS: Record<string, string> = {
  'Hofnarr Hugo': 'bot-hugo', 'Gräfin Gisela': 'bot-gisela', 'Bauer Bernd': 'bot-bernd', 'Ritter Rüdiger': 'bot-ruediger',
  'Köchin Klara': 'bot-klara', 'Mönch Matthias': 'bot-matthias', 'Baronin Berta': 'bot-berta', 'Schäferin Sina': 'bot-sina',
  'Steinmetz Stefan': 'bot-stefan', 'Näherin Nora': 'bot-nora', 'Erzbischof Egon': 'bot-egon', 'Marschall Max': 'bot-max',
};

/** Art id for a bot's (untranslated) name; extra bots get the generic courtier. */
export function botArtId(name: string): string {
  return BOT_ART_IDS[name] ?? 'bot-hoefling';
}

/** Small SVG image of a bot's portrait (served and cached by the app API route). */
export function botArtUrl(name: string): string {
  return `/api/app/art/${botArtId(name)}?kind=icon`;
}
