import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '/Users/aiden/Desktop/Rocket/node_modules/playwright/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CAPTURES_DIR = path.join(ROOT, 'captures');
const ORI_DIR = '/Users/aiden/.buzz-dev/.scratch/ori/munjang';

if (!fs.existsSync(CAPTURES_DIR)) {
  fs.mkdirSync(CAPTURES_DIR, { recursive: true });
}

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let p = path.join(DIST, req.url.split('?')[0]);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (fs.existsSync(p) && fs.statSync(p).isFile()) {
    const ext = path.extname(p);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const BASE_URL = `http://127.0.0.1:${port}/`;
console.log(`Test server running at ${BASE_URL}`);

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true
});

const viewports = [
  { name: '390', width: 390, height: 844 },
  { name: '820', width: 820, height: 1180 },
  { name: '1280', width: 1280, height: 900 }
];

const themes = ['light', 'dark'];
const frames = [
  { id: 'act', label: 'Someone does something' },
  { id: 'go', label: 'Going somewhere' },
  { id: 'exist', label: 'Something is at a place' }
];

const capturedFiles = [];

try {
  for (const vp of viewports) {
    for (const theme of themes) {
      console.log(`\n=== Testing Viewport ${vp.name} (${theme}) ===`);
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme,
        deviceScaleFactor: 2
      });
      const page = await ctx.newPage();
      const pageErrs = [];
      page.on('pageerror', err => pageErrs.push(err.message));

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.evaluate((th) => {
        localStorage.clear();
        localStorage.setItem('munjang.theme', th);
        document.documentElement.dataset.theme = th;
      }, theme);
      await page.reload({ waitUntil: 'networkidle' });

      // Start studio by clicking a letter
      await page.click('.jamo:has-text("ㅂ")');
      await page.waitForTimeout(300);

      for (const fr of frames) {
        // Switch frame
        await page.click('#frame-btn');
        await page.waitForTimeout(200);
        await page.click(`#frames button:has-text("${fr.label}")`);
        await page.waitForTimeout(300);

        // Fill out particles if prompted
        const pOpts = await page.$$('#ppanel .p-opt');
        if (pOpts.length > 0) {
          await pOpts[0].click();
          await page.waitForTimeout(200);
        }
        const pOpts2 = await page.$$('#ppanel .p-opt');
        if (pOpts2.length > 0) {
          await pOpts2[0].click();
          await page.waitForTimeout(200);
        }

        const shotPath = path.join(CAPTURES_DIR, `frame_${fr.id}_${vp.name}_${theme}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });
        capturedFiles.push(shotPath);
        console.log(`Saved screenshot: frame_${fr.id}_${vp.name}_${theme}.png`);
      }

      // Test Picker UI features across all viewports (390, 820, 1280) and themes (light, dark)
      // Switch to 'act' frame so transitive verbs like '주문하다' can be selected
      await page.click('#frame-btn');
      await page.waitForTimeout(200);
      await page.click('#frames button:has-text("Someone does something")');
      await page.waitForTimeout(300);

      // Find a verb slot button to open picker
      const verbSlots = await page.$$('#slots .slot-w .slot-v');
      if (verbSlots.length > 0) {
        // Click the verb slot
        await verbSlots[verbSlots.length - 1].click();
        await page.waitForTimeout(300);

        // Assert 0 horizontal overflow with picker open (initial state)
        const scrollWidthInit = await page.evaluate(() => document.documentElement.scrollWidth);
        const innerWidth = await page.evaluate(() => window.innerWidth);
        console.log(`[QA Overflow Check] ${vp.name}_${theme} (initial): scrollWidth=${scrollWidthInit}, innerWidth=${innerWidth}`);
        if (scrollWidthInit > innerWidth) {
          throw new Error(`Horizontal scroll detected on picker initial in ${vp.name}_${theme}! scrollWidth (${scrollWidthInit}) > innerWidth (${innerWidth})`);
        }

        // Count Lv1 items
        const countLv1 = await page.$$eval('.picker-list .pk', els => els.length);

        // Screenshot 1: Picker initial state with search and "Show more" button
        const pickerInitPath = path.join(CAPTURES_DIR, `picker_initial_${vp.name}_${theme}.png`);
        await page.screenshot({ path: pickerInitPath, fullPage: false });
        capturedFiles.push(pickerInitPath);
        console.log(`Saved screenshot: picker_initial_${vp.name}_${theme}.png`);

        // Click "Show more" ("더 보기")
        const moreBtn = await page.$('.picker-more');
        if (moreBtn) {
          await moreBtn.click();
          await page.waitForTimeout(300);

          const countAll = await page.$$eval('.picker-list .pk', els => els.length);
          console.log(`[Picker Counts] ${vp.name}_${theme}: Lv1 ${countLv1} words / Total ${countAll} words`);

          // Assert 0 horizontal overflow with picker expanded
          const scrollWidthMore = await page.evaluate(() => document.documentElement.scrollWidth);
          console.log(`[QA Overflow Check] ${vp.name}_${theme} (more): scrollWidth=${scrollWidthMore}, innerWidth=${innerWidth}`);
          if (scrollWidthMore > innerWidth) {
            throw new Error(`Horizontal scroll detected on picker more in ${vp.name}_${theme}! scrollWidth (${scrollWidthMore}) > innerWidth (${innerWidth})`);
          }

          const pickerMorePath = path.join(CAPTURES_DIR, `picker_more_${vp.name}_${theme}.png`);
          await page.screenshot({ path: pickerMorePath, fullPage: false });
          capturedFiles.push(pickerMorePath);
          console.log(`Saved screenshot: picker_more_${vp.name}_${theme}.png`);
        } else {
          console.log(`[Picker Counts] ${vp.name}_${theme}: Lv1 ${countLv1} words (No more button)`);
        }

        // Test search input on desktop light and mobile dark
        if ((vp.name === '1280' && theme === 'light') || (vp.name === '390' && theme === 'dark')) {
          const searchInp = await page.$('.picker-search-input');
          if (searchInp) {
            await searchInp.fill('주문'); // order
            await page.waitForTimeout(300);
            const pickerSearchPath = path.join(CAPTURES_DIR, `picker_search_${vp.name}_${theme}.png`);
            await page.screenshot({ path: pickerSearchPath, fullPage: false });
            capturedFiles.push(pickerSearchPath);
            console.log(`Saved screenshot: picker_search_${vp.name}_${theme}.png`);

            // Pick the searched word
            const firstResult = await page.$('.picker-list .pk');
            if (firstResult) {
              await firstResult.click();
              await page.waitForTimeout(400);

              // Pick correct particles to complete sentence
              const gaBtn = await page.$('#ppanel .p-opt:has-text("가")');
              if (gaBtn) await gaBtn.click();
              await page.waitForTimeout(250);

              const reulBtn = await page.$('#ppanel .p-opt:has-text("를")');
              if (reulBtn) await reulBtn.click();
              await page.waitForTimeout(250);

              const previewEl = await page.$('#preview');
              if (previewEl) await previewEl.scrollIntoViewIfNeeded();
              await page.waitForTimeout(200);

              const previewAutoPath = path.join(CAPTURES_DIR, `preview_auto_badge_${vp.name}_${theme}.png`);
              await page.screenshot({ path: previewAutoPath, fullPage: false });
              capturedFiles.push(previewAutoPath);
              console.log(`Saved screenshot: preview_auto_badge_${vp.name}_${theme}.png`);
            }
          }

          // Footer license screenshot
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(300);
          const footerPath = path.join(CAPTURES_DIR, `footer_license_${vp.name}_${theme}.png`);
          await page.screenshot({ path: footerPath, fullPage: false });
          capturedFiles.push(footerPath);
          console.log(`Saved screenshot: footer_license_${vp.name}_${theme}.png`);
        }
      }

      if (pageErrs.length > 0) {
        console.error(`Page errors for ${vp.name}_${theme}:`, pageErrs);
      }
      await ctx.close();
    }
  }

  // Copy captured files to ori dir as well
  if (fs.existsSync(ORI_DIR)) {
    for (const f of capturedFiles) {
      const dest = path.join(ORI_DIR, path.basename(f));
      fs.copyFileSync(f, dest);
    }
    console.log(`Copied ${capturedFiles.length} screenshots to ${ORI_DIR}`);
  }

  console.log(`\nAll ${capturedFiles.length} screenshots captured successfully!`);
} finally {
  await browser.close();
  server.close();
}
