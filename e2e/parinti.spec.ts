import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('parent app: library filters, detail, save to plan', async ({ page }) => {
  await page.goto('./parinti/');
  await expect(page).toHaveTitle('Insula · Părinți');
  await page.getByTestId('where-parc').click();
  await expect(page.getByTestId('count')).toContainText('idei');
  await page.getByTestId('activity').first().click();
  await expect(page.getByTestId('detail')).toBeVisible();
  await page.getByTestId('save-activity').click();
  await page.getByLabel('Închide').click();
  await page.getByTestId('nav-plan').click();
  await expect(page.getByText('Salvate (1)')).toBeVisible();
});

test('parent app: AI ideas (Gemini answer simulated, nothing leaves the test)', async ({ page }) => {
  let body = '';
  await page.route('**/interactions**', async (route) => {
    body = route.request().postData() ?? '';
    const answer = {
      activities: [
        {
          title: 'Bowling cu pahare',
          minutes: 15,
          energy: 'activ',
          skills: ['numere', 'miscare'],
          materials: ['6 pahare', 'o minge moale'],
          play: ['Așezați paharele în triunghi.', 'Rostogolește mingea și numără paharele căzute.'],
          goal: 'Numărat până la 6.',
          safety: 'Mingea moale, departe de obiecte fragile.',
        },
      ],
    };
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test',
        status: 'completed',
        steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(answer) }] }],
      }),
    });
  });
  await page.goto('./parinti/');
  await page.getByTestId('nav-creeaza').click();
  await expect(page.getByTestId('need-key')).toBeVisible();
  await page.getByTestId('nav-setari').click();
  await page.getByTestId('key-input').fill('test-key-not-real');
  await page.getByRole('button', { name: 'Salvează' }).click();
  await page.getByTestId('nav-creeaza').click();
  await expect(page.getByTestId('need-key')).toHaveCount(0);
  await page.getByTestId('generate').click();
  await expect(page.getByText('Bowling cu pahare')).toBeVisible();
  expect(body).toContain('application/json');
  expect(body).toContain('3 cm'); // safety rules travel with the request
});

test('the child app never calls the network for AI', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost')) calls.push(r.url());
  });
  await page.goto('./');
  await page.getByTestId('start').click();
  await page.getByTestId('island-bambus').click();
  await page.getByTestId('card-panda').click();
  await page.waitForTimeout(1500);
  expect(calls).toEqual([]);
});
