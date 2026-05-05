import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const h5 = readFileSync("public/h5/index.html", "utf8");

describe("H5 landing page", () => {
  it("uses social seeding copy with project feature highlights", () => {
    for (const text of [
      "回血计数器",
      "今天上班，回血了吗？",
      "在线估算",
      "项目功能亮点",
      "下载桌面版",
      "每秒到账",
      "自动状态",
      "摸鱼收益",
      "轻角色",
      "低频提醒",
      "分享战报",
      "适合发给同事",
      "隐私承诺",
      "常见问题",
      "开源仓库",
      "提交反馈",
    ]) {
      assert.match(h5, new RegExp(text));
    }

    assert.match(h5, /https:\/\/github\.com\/425732441\/money_counter/);
    assert.match(h5, /https:\/\/github\.com\/425732441\/money_counter\/issues/);
  });

  it("prominently links to Serv00 installer and portable downloads", () => {
    assert.match(h5, /id="download"/);
    assert.match(h5, /class="download-card"/);
    assert.match(
      h5,
      /https:\/\/money-counter\.hualeizhang\.serv00\.net\/download\/installer\/MoneyCounter-0\.0\.1-setup\.exe/,
    );
    assert.match(
      h5,
      /https:\/\/money-counter\.hualeizhang\.serv00\.net\/download\/portable\/MoneyCounter-0\.0\.1-portable\.exe/,
    );
    assert.match(h5, /安装版/);
    assert.match(h5, /绿色版/);
    assert.doesNotMatch(h5, /money_counter\.hualeizhang\.serv00\.net/);
  });

  it("removes download-oriented FAQ copy from the seeding page", () => {
    assert.doesNotMatch(h5, /为什么下载入口还没有安装包？/);

    for (const question of [
      "这个网页会上传我的收入吗？",
      "这个估算准不准？",
      "适合在办公室用吗？",
    ]) {
      assert.match(h5, new RegExp(question));
    }
  });

  it("does not use prompt or AI-generation oriented copy", () => {
    for (const forbidden of [
      /提示词/i,
      /\bprompt\b/i,
      /AIGC/i,
      /大模型/,
      /AI 生成/i,
      /指令/,
      /生成今日/,
      /生成图片/,
    ]) {
      assert.doesNotMatch(h5, forbidden);
    }
  });

  it("styles feature highlights as polished responsive cards", () => {
    assert.equal((h5.match(/class="feature-chip"/g) || []).length, 6);
    assert.equal((h5.match(/class="feature-icon"/g) || []).length, 6);
    assert.match(h5, /\.feature-chip\s*\{[^}]*min-height:\s*168px;/);
    assert.match(h5, /\.feature-chip:hover\s*\{/);
    assert.match(h5, /\.feature-chip:hover\s+\.feature-icon\s*\{/);
    assert.match(h5, /@media\s*\(max-width:\s*920px\)/);
    assert.doesNotMatch(h5, /\.release-panel\s*\{/);
  });

  it("provides a local-only income estimator without network collection", () => {
    for (const id of [
      "h5-income-mode",
      "h5-income-amount",
      "h5-work-days",
      "h5-daily-hours",
      "h5-estimate-result",
    ]) {
      assert.match(h5, new RegExp(`id="${id}"`));
    }

    assert.match(h5, /function calculateEstimate/);
    assert.match(h5, /addEventListener\("input"/);
    assert.doesNotMatch(h5, /\bfetch\s*\(/);
    assert.doesNotMatch(h5, /XMLHttpRequest/);
    assert.doesNotMatch(h5, /analytics|gtag|track/i);
  });

  it("uses responsive accessible styling for a mobile landing page", () => {
    assert.match(h5, /<meta name="viewport"/);
    assert.match(h5, /:focus-visible/);
    assert.match(h5, /@media\s*\(max-width:\s*720px\)/);
    assert.match(h5, /aria-live="polite"/);
  });
});
