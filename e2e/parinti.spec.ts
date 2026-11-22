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

test('parent app: home shortcuts, idea of the day and the surprise idea', async ({ page }) => {
  await page.goto('./parinti/');
  await page.getByTestId('idea-of-day').click();
  await expect(page.getByTestId('detail')).toBeVisible();
  await page.getByLabel('Închide').click();
  await expect(page.getByTestId('detail')).toHaveCount(0);
  await page.getByTestId('quick-surpriza').click();
  await expect(page.getByTestId('detail')).toBeVisible();
  await page.getByLabel('Închide').click();
  await page.getByTestId('quick-poveste').click();
  await expect(page.getByTestId('make-story')).toBeVisible();
  await page.getByText('Mergi la Setări').click();
  await expect(page.getByTestId('key-input')).toBeVisible();
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

const act = (title: string) => ({
  title,
  minutes: 10,
  energy: 'calm',
  skills: ['numere'],
  materials: ['nimic'],
  play: ['Pasul 1.', 'Pasul 2.'],
  goal: 'Numărat.',
  safety: 'Un adult e lângă copil.',
});

async function mockGemini(page: import('@playwright/test').Page, bodies: string[]) {
  await page.route('**/interactions**', async (route) => {
    const body = route.request().postData() ?? '';
    bodies.push(body);
    let answer: unknown;
    if (body.includes('poveste de seară'))
      answer = {
        title: 'Pufi și luna',
        paragraphs: ['A fost odată Pufi.', 'Pufi a văzut luna.', 'Noapte bună!'],
        questions: ['Ce a văzut Pufi?'],
      };
    else if (body.includes('exact 7 activități'))
      answer = {
        activities: ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'].map((d) =>
          act(`Joc de ${d}`),
        ),
      };
    else if (body.includes('Rescrie-o')) answer = { activities: [act('Varianta fără materiale')] };
    else answer = { activities: [act('Idee AI')] };
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: 't',
        status: 'completed',
        steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(answer) }] }],
      }),
    });
  });
}

async function setKey(page: import('@playwright/test').Page) {
  await page.getByTestId('nav-setari').click();
  await page.getByTestId('key-input').fill('test-key-not-real');
  await page.getByRole('button', { name: 'Salvează' }).click();
}

test('parent app: profile goes into the request; bedtime story is written and shown', async ({ page }) => {
  const bodies: string[] = [];
  await mockGemini(page, bodies);
  await page.goto('./parinti/');
  await setKey(page);
  await page.getByTestId('profile').getByPlaceholder('Poreclă (opțional)').fill('Rița');
  await page.getByTestId('nav-poveste').click();
  await page.getByTestId('make-story').click();
  await expect(page.getByTestId('story')).toContainText('Pufi și luna');
  await expect(page.getByTestId('story')).toContainText('Ce a văzut Pufi?');
  expect(bodies.at(-1)).toContain('Rița');
  expect(bodies.at(-1)).toContain('thinking_level');
});

test('parent app: AI week plan fills all 7 days; history keeps AI ideas', async ({ page }) => {
  await mockGemini(page, []);
  await page.goto('./parinti/');
  await setKey(page);
  await page.getByTestId('nav-plan').click();
  await page.getByTestId('week-ai').click();
  for (const d of ['Luni', 'Duminică']) await expect(page.getByText(`Joc de ${d}`).first()).toBeVisible();
  await page.getByTestId('nav-creeaza').click();
  await page.getByTestId('generate').click();
  await expect(page.getByText('Idee AI')).toBeVisible();
  await page.getByTestId('nav-plan').click();
  await expect(page.getByText(/Istoric idei AI \(\d+\)/)).toBeVisible();
});

test('parent app: refine an idea ("Fără materiale") replaces it in place', async ({ page }) => {
  await mockGemini(page, []);
  await page.goto('./parinti/');
  await setKey(page);
  await page.getByTestId('nav-idei').click();
  await page.getByTestId('activity').first().click();
  await page.getByTestId('refine-fara').click();
  await expect(page.getByTestId('detail')).toContainText('Varianta fără materiale');
});
