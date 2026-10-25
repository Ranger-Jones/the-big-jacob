import { expect, test } from '@playwright/test';
import { GATE_ANSWER } from './accounts';

test('gate, sign-up, table with bots, draw and court', async ({ page }) => {
  const name = `e2e_${Date.now().toString(36)}`.slice(0, 20);
  await page.goto('/');
  await expect(page).toHaveURL(/\/zugang/);
  await page.getByLabel('Wer ist mein Lieblings Rettungsdienstmitarbeiter?').fill(GATE_ANSWER);
  await page.getByRole('button', { name: 'Tor öffnen' }).click();
  await expect(page).not.toHaveURL(/\/zugang/);

  await page.goto('/registrieren');
  await page.getByLabel('Benutzername').fill(name);
  await page.getByLabel('E-Mail').fill(`${name}@test.local`);
  await page.getByLabel('Passwort').fill('narrenkappe-123');
  await page.getByRole('button', { name: 'Account erstellen' }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`Willkommen am Hof, ${name}`) })).toBeVisible();

  await page.getByRole('button', { name: 'Neuen Tisch eröffnen' }).click();
  await expect(page.getByRole('heading', { name: 'Der Tisch wird gedeckt' })).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '🦊 Gerissen' }).click();
  await expect(page.getByText('freier Platz')).toHaveCount(4);
  await page.getByRole('button', { name: 'Spiel starten' }).click();

  await page.getByRole('button', { name: 'Diese Karte ziehen' }).first().click();
  await expect(page.getByRole('heading', { name: /Hofzeremonie/ })).toBeVisible();
  await page.getByRole('button', { name: 'Bereit', exact: true }).click();
  await expect(page.getByLabel('Deine Karten')).toBeVisible();
});
