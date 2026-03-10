/**
 * 使用 Groq API (Llama 3 8B) 批量生成 TDD 桩
 * 成本: $0.05/1M tokens = 生成1000题仅需约 $0.10
 */
const fs = require('fs');
const path = require('path');
const { generateTDDFiles } = require('./groq-agent');

const PROBLEMS_DIR = path.join(__dirname, '..', 'problems');

async function processProblem(problemDir) {
    const problemName = path.basename(problemDir);
    const rawPath = path.join(problemDir, 'raw.md');

    if (!fs.existsSync(rawPath)) {
        return { status: 'skip', reason: 'no raw.md', name: problemName };
    }

    if (fs.existsSync(path.join(problemDir, 'problem.md'))) {
        return { status: 'skip', reason: 'exists', name: problemName };
    }

    try {
        const rawContent = fs.readFileSync(rawPath, 'utf-8');
        const problemNum = problemName.substring(0, 4);

        process.stdout.write(`[${problemNum}] `);
        const files = await generateTDDFiles(rawContent, problemNum);

        if (Object.keys(files).length === 0) {
            return { status: 'error', reason: 'empty response', name: problemName };
        }

        Object.entries(files).forEach(([filename, content]) => {
            fs.writeFileSync(path.join(problemDir, filename), content, 'utf-8');
        });

        return { status: 'ok', files: Object.keys(files).length, name: problemName };
    } catch (err) {
        return { status: 'error', reason: err.message, name: problemName };
    }
}

async function main() {
    const [, , start = '0006', end = '9999', concurrency = '5'] = process.argv;
    const startNum = parseInt(start);
    const endNum = parseInt(end);
    const limit = parseInt(concurrency);

    if (!process.env.GROQ_API_KEY) {
        console.error('Error: GROQ_API_KEY not set');
        console.log('Get free key at: https://console.groq.com/keys');
        process.exit(1);
    }

    const entries = fs.readdirSync(PROBLEMS_DIR)
        .filter(e => /^\d{4}_/.test(e))
        .map(e => ({ name: e, num: parseInt(e.substring(0, 4)) }))
        .filter(({ num }) => num >= startNum && num <= endNum)
        .sort((a, b) => a.num - b.num);

    console.log(`Groq API TDD Generator`);
    console.log(`Model: ${process.env.GROQ_MODEL || 'llama3-8b-8192'}`);
    console.log(`Range: ${start} - ${end}`);
    console.log(`Found: ${entries.length} problems`);
    console.log(`Concurrency: ${limit}\n`);

    const stats = { ok: 0, skip: 0, error: 0 };
    const batch = [];

    for (const { name } of entries) {
        const p = processProblem(path.join(PROBLEMS_DIR, name)).then(r => {
            stats[r.status]++;
            const icon = r.status === 'ok' ? '✓' : r.status === 'skip' ? '-' : '✗';
            process.stdout.write(`${icon}`);
            return r;
        });

        batch.push(p);

        if (batch.length >= limit) {
            await Promise.all(batch.splice(0, limit));
            await new Promise(r => setTimeout(r, 100));
        }
    }

    await Promise.all(batch);

    console.log(`\n\nDone! OK:${stats.ok} Skip:${stats.skip} Error:${stats.error}`);
    console.log(`Approx cost: $${(stats.ok * 0.0002).toFixed(4)}`);
}

main().catch(console.error);
