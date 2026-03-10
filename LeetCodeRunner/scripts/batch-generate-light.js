/**
 * 使用轻量级模型(GPT-3.5)批量生成TDD桩
 * 用法: node batch-generate-light.js <start> <end>
 * 例: node batch-generate-light.js 0006 0100
 */
const fs = require('fs');
const path = require('path');
const { generateProblemFiles } = require('./light-agent');

const PROBLEMS_DIR = path.join(__dirname, '..', 'problems');

async function processProblem(problemDir) {
    const problemName = path.basename(problemDir);
    const rawPath = path.join(problemDir, 'raw.md');

    if (!fs.existsSync(rawPath)) {
        console.log(`[SKIP] ${problemName}: no raw.md`);
        return { status: 'skip', reason: 'no raw.md' };
    }

    // 检查是否已存在
    if (fs.existsSync(path.join(problemDir, 'problem.md'))) {
        console.log(`[SKIP] ${problemName}: already exists`);
        return { status: 'skip', reason: 'exists' };
    }

    try {
        const rawContent = fs.readFileSync(rawPath, 'utf-8');
        const problemNum = problemName.substring(0, 4);

        console.log(`[PROCESSING] ${problemName}...`);
        const files = await generateProblemFiles(rawContent, problemNum);

        Object.entries(files).forEach(([filename, content]) => {
            const filepath = path.join(problemDir, filename);
            fs.writeFileSync(filepath, content, 'utf-8');
            console.log(`  [OK] ${filename}`);
        });

        return { status: 'success', files: Object.keys(files) };
    } catch (err) {
        console.error(`  [ERROR] ${problemName}: ${err.message}`);
        return { status: 'error', error: err.message };
    }
}

async function main() {
    const [, , start, end] = process.argv;
    const startNum = parseInt(start || '0006');
    const endNum = parseInt(end || '9999');

    // 获取所有题目目录
    const entries = fs.readdirSync(PROBLEMS_DIR)
        .filter(e => /^\d{4}_/.test(e))
        .map(e => ({ name: e, num: parseInt(e.substring(0, 4)) }))
        .filter(({ num }) => num >= startNum && num <= endNum)
        .sort((a, b) => a.num - b.num);

    console.log(`Found ${entries.length} problems to process (${startNum}-${endNum})`);
    console.log(`Using model: ${process.env.LIGHT_MODEL || 'gpt-3.5-turbo'}`);
    console.log('');

    const stats = { success: 0, skip: 0, error: 0 };

    // 串行处理（避免API限流）
    for (const { name, num } of entries) {
        const result = await processProblem(path.join(PROBLEMS_DIR, name));
        stats[result.status]++;

        // 每10题暂停1秒（避免限流）
        if ((stats.success + stats.skip + stats.error) % 10 === 0) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    console.log('');
    console.log('=== Summary ===');
    console.log(`Success: ${stats.success}`);
    console.log(`Skipped: ${stats.skip}`);
    console.log(`Errors: ${stats.error}`);
}

main().catch(console.error);
