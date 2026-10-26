import { expect, test } from '@playwright/test';

test('connexion puis tableau de bord avec mesures en temps réel', async ({ page }) => {
  await page.goto('/');
  // Sans token, on est renvoyé vers la connexion
  await expect(page).toHaveURL(/\/login$/);

  await page.locator('input[type=email]').fill('admin@demo.fr');
  await page.locator('input[type=password]').fill('demo1234');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page.getByRole('heading', { name: 'Supervision des équipements' })).toBeVisible();
  const row = page.getByRole('row', { name: /Capteur Versailles/ });
  await expect(row).toBeVisible();
  // Une mesure arrive par WebSocket (toutes les 3 s)
  await expect(row).toContainText(/\d+(\.\d)? °C/, { timeout: 15_000 });
});

test('mauvais mot de passe : message d’erreur', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=password]').fill('mauvais-mdp');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByText('Identifiants invalides')).toBeVisible();
});
