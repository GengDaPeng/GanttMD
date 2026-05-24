// 守卫：保证给使用方部署的 index.html / rules.js 在多个位置保持字节一致
//
// 现在 GanttMD 推荐使用方只复制 .ganttmd/ 一个目录就能跑（不再要求复制 tools/）。
// 仓库里的副本分布：
//   - tools/ganttmd/           ：源副本，src/validator.js 通过它加载共享规则
//   - examples/jwxt-lite/.ganttmd/ ：jwxt 真实感样例的可运行副本
//   - examples/minimal/.ganttmd/    ：最小样例的可运行副本
//
// 任何一处改了，其他两处必须同步。这个测试会在它们字节不一致时失败，
// 防止使用方拿到的样例和真正的工具版本漂移。
//
// 同步命令（如果有人手动改了 tools/ganttmd/ 但忘了拷贝）：
//   cp tools/ganttmd/index.html tools/ganttmd/rules.js examples/jwxt-lite/.ganttmd/
//   cp tools/ganttmd/index.html tools/ganttmd/rules.js examples/minimal/.ganttmd/

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const SOURCE_DIR = path.join(__dirname, '..', 'tools', 'ganttmd');
const COPIES = [
  path.join(__dirname, '..', 'examples', 'jwxt-lite', '.ganttmd'),
  path.join(__dirname, '..', 'examples', 'minimal', '.ganttmd'),
];
const FILES = ['index.html', 'rules.js'];

function sha(filePath) {
  const buf = fs.readFileSync(filePath);
  return require('node:crypto').createHash('sha256').update(buf).digest('hex');
}

for (const fileName of FILES) {
  test(`${fileName} 在 tools/ganttmd 与所有 examples/*/.ganttmd 中保持字节一致`, () => {
    const sourcePath = path.join(SOURCE_DIR, fileName);
    assert.ok(fs.existsSync(sourcePath), `源副本不存在：${sourcePath}`);
    const sourceHash = sha(sourcePath);

    for (const copyDir of COPIES) {
      const copyPath = path.join(copyDir, fileName);
      assert.ok(
        fs.existsSync(copyPath),
        `样例缺少 ${fileName}：${copyPath}\n` +
          `请同步：cp tools/ganttmd/${fileName} ${path.relative(path.join(__dirname, '..'), copyPath)}`
      );
      assert.equal(
        sha(copyPath),
        sourceHash,
        `${fileName} 在 ${copyPath} 与 tools/ganttmd/${fileName} 字节不一致；` +
          `请同步：cp tools/ganttmd/${fileName} ${path.relative(path.join(__dirname, '..'), copyPath)}`
      );
    }
  });
}
