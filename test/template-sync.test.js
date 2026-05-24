// 守卫：保证所有样例的 index.html / rules.js 与 canonical 副本字节一致。
//
// 仓库的 canonical 开发位置：
//   examples/minimal/.ganttmd/{index.html, rules.js}
//
// 其他样例（jwxt-lite）和使用方项目都应该从这里复制。
// CLI 验证器（bin/validator.js）也直接 require 这里的 rules.js。
//
// 任何一处改了 minimal，其他样例必须同步。这个测试在不一致时失败，
// 防止使用方拿到的样例和真正的工具版本漂移。
//
// 同步命令（如果改了 minimal 但忘了拷贝到 jwxt-lite）：
//   cp examples/minimal/.ganttmd/index.html examples/jwxt-lite/.ganttmd/
//   cp examples/minimal/.ganttmd/rules.js   examples/jwxt-lite/.ganttmd/

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const CANONICAL_DIR = path.join(__dirname, '..', 'examples', 'minimal', '.ganttmd');
const SYNCED_DIRS = [
  path.join(__dirname, '..', 'examples', 'jwxt-lite', '.ganttmd'),
];
const FILES = ['index.html', 'rules.js', 'validate.js'];

function sha(filePath) {
  const buf = fs.readFileSync(filePath);
  return require('node:crypto').createHash('sha256').update(buf).digest('hex');
}

for (const fileName of FILES) {
  test(`${fileName} 在 canonical（examples/minimal/.ganttmd）与所有其他样例间保持字节一致`, () => {
    const canonicalPath = path.join(CANONICAL_DIR, fileName);
    assert.ok(fs.existsSync(canonicalPath), `canonical 副本不存在：${canonicalPath}`);
    const canonicalHash = sha(canonicalPath);

    for (const syncedDir of SYNCED_DIRS) {
      const syncedPath = path.join(syncedDir, fileName);
      assert.ok(
        fs.existsSync(syncedPath),
        `样例缺少 ${fileName}：${syncedPath}\n` +
          `请同步：cp examples/minimal/.ganttmd/${fileName} ${path.relative(path.join(__dirname, '..'), syncedPath)}`
      );
      assert.equal(
        sha(syncedPath),
        canonicalHash,
        `${fileName} 在 ${syncedPath} 与 canonical 字节不一致；` +
          `请同步：cp examples/minimal/.ganttmd/${fileName} ${path.relative(path.join(__dirname, '..'), syncedPath)}`
      );
    }
  });
}
