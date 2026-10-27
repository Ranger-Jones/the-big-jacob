import { describe, expect, it } from 'vitest';
import { format, localeFromHeader, translate } from './core';

describe('i18n core', () => {
  it('keeps German and translates English with fallback', () => {
    expect(translate('de', 'Bestenliste')).toBe('Bestenliste');
    expect(translate('en', 'Bestenliste')).toBe('Leaderboard');
    expect(translate('en', 'Gibt es nicht im Wörterbuch')).toBe('Gibt es nicht im Wörterbuch');
  });
  it('fills placeholders', () => {
    expect(format('{name} ist dran', { name: 'Gisela' })).toBe('Gisela ist dran');
    expect(translate('en', 'Dein Profil, Level {level}', { level: 3 })).toBe('Your profile, level 3');
  });
  it('translates finished sentences through placeholder keys', () => {
    expect(translate('en', 'Dein Profil, Level 7')).toBe('Your profile, level 7');
  });
  it('leaves user text that matches Object.prototype keys alone', () => {
    expect(translate('en', 'constructor')).toBe('constructor');
    expect(translate('en', '__proto__')).toBe('__proto__');
    expect(translate('en', 'toString')).toBe('toString');
  });
  it('reads the browser language', () => {
    expect(localeFromHeader('en-US,en;q=0.9')).toBe('en');
    expect(localeFromHeader('de-DE,de;q=0.9,en;q=0.8')).toBe('de');
    expect(localeFromHeader(null)).toBe('de');
  });
});
