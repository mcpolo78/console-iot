import { expect, test } from '@playwright/test';

test('démo publique : tableau de bord sans connexion, mesures en temps réel', async ({ page }) => {
  await page.goto('/');
  // Sans token, accès visiteur automatique (lecture seule)
  await expect(page.getByRole('heading', { name: 'Supervision des équipements' })).toBeVisible();
  await expect(page.getByText('Démo en lecture seule')).toBeVisible();
  const row = page.getByRole('row', { name: /Capteur Versailles/ });
  await expect(row).toBeVisible();
  // Une mesure arrive par WebSocket (toutes les 3 s)
  await expect(row).toContainText(/\d+(\.\d)? °C/, { timeout: 15_000 });
});

test('connexion avec un compte de test puis tableau de bord', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('admin@demo.fr');
  await page.locator('input[type=password]').fill('demo1234');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page.getByRole('heading', { name: 'Supervision des équipements' })).toBeVisible();
  await expect(page.getByRole('row', { name: /Capteur Versailles/ })).toBeVisible();
  await expect(page.getByText('Démo en lecture seule')).toBeHidden();
});

test('mauvais mot de passe : message d’erreur', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=password]').fill('mauvais-mdp');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByText('Identifiants invalides')).toBeVisible();
});
