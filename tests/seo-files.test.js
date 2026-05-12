import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const siteUrl = "https://money-counter.hualeizhang.serv00.net/";
const h5 = readFileSync("public/h5/index.html", "utf8");

describe("SEO publishing files", () => {
  it("exposes crawl rules with the canonical sitemap URL", () => {
    const robots = readFileSync("public/h5/robots.txt", "utf8");

    assert.match(robots, /^User-agent: \*$/m);
    assert.match(robots, /^Allow: \/$/m);
    assert.match(
      robots,
      /^Sitemap: https:\/\/money-counter\.hualeizhang\.serv00\.net\/sitemap\.xml$/m,
    );
    assert.doesNotMatch(robots, /Disallow:\s*\//);
  });

  it("lists the HTTPS root page as the canonical sitemap URL", () => {
    const sitemap = readFileSync("public/h5/sitemap.xml", "utf8");

    assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
    assert.match(sitemap, new RegExp(`<loc>${siteUrl}</loc>`));
    assert.match(sitemap, /<lastmod>2026-05-12<\/lastmod>/);
  });

  it("declares crawlable, shareable metadata in the HTML source head", () => {
    assert.match(
      h5,
      /<meta name="description" content="回血计数器是打工人的桌面回血小工具，支持在线估算每秒到账、工作日进度、摸鱼收益和下班前回血状态。" \/>/,
    );
    assert.match(h5, new RegExp(`<link rel="canonical" href="${siteUrl}" />`));
    assert.match(h5, /<meta name="robots" content="index, follow" \/>/);
    assert.match(h5, /<meta property="og:type" content="website" \/>/);
    assert.match(h5, new RegExp(`<meta property="og:url" content="${siteUrl}" />`));
    assert.match(h5, /<meta property="og:site_name" content="回血计数器" \/>/);
  });
});
