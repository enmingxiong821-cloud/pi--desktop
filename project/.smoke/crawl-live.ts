// 本机验证：真实抓取 example.com，不走搜索种子。
import { app } from 'electron';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startCrawl } from '../backend/crawl-engine.js';
import { detectTools } from '../backend/external-tools.js';

const dir = mkdtempSync(path.join(os.tmpdir(), 'pi-crawl-live-'));
app.setPath('userData', dir);
writeFileSync(path.join(dir, 'advanced-tools.json'), JSON.stringify({ webSearch: true, crawl: true }));

app.whenReady().then(async () => {
  const tools = await detectTools();
  console.log('tools', JSON.stringify(tools.map((item) => [item.id, item.installed, item.version])));
  const timer = setTimeout(() => {
    console.error('timeout');
    app.exit(2);
  }, 90000);
  const mode = (process.env.CRAWL_MODE || 'page') as 'search' | 'page' | 'site';
  const result = startCrawl(
    {
      mode,
      query: process.env.CRAWL_QUERY || 'pi workbench',
      url: process.env.CRAWL_URL || 'https://example.com/',
      maxPages: 1,
      maxDepth: 0,
      js: process.env.CRAWL_JS === '1',
    },
    (event) => {
      if (event.phase !== 'done' && event.phase !== 'error' && event.phase !== 'canceled') return;
      clearTimeout(timer);
      console.log(JSON.stringify({
        start: result,
        phase: event.phase,
        message: event.message,
        pages: event.pages?.map((page) => ({
          url: page.url,
          title: page.title,
          engine: page.engine,
          bytes: page.bytes,
          text: page.text.slice(0, 160),
        })),
      }, null, 2));
      app.exit(event.phase === 'done' && (event.pages?.length ?? 0) > 0 ? 0 : 1);
    },
  );
  if (!result.ok) {
    clearTimeout(timer);
    console.error(result.error);
    app.exit(1);
  }
});
