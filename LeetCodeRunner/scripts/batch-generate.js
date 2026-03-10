const fs = require('fs');
const path = require('path');

const baseDir = 'D:/code/NewCodingParadigm/LeetCodeRunner';
const batchFile = '/tmp/batch_ab';

// Parse problem folder name
function parseProblemFolder(folderName) {
    const match = folderName.match(/^(\d{4})_(.+)$/);
    if (!match) return null;
    const [, num, name] = match;
    return {
        id: num,
        name: name,
        folder: folderName,
        difficulty: 'Medium',
        title: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    };
}

// Parse raw.md content
function parseRawMd(content) {
    const difficultyMatch = content.match(/\((Easy|Medium|Hard)\)/);
    const difficulty = difficultyMatch ? difficultyMatch[1] : 'Medium';

    const descMatch = content.match(/<p>(.+?)<\/p>/s);
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    const constraints = [];
    const constraintMatch = content.match(/<strong>提示[：:]?<\/strong>\s*<ul>([\s\S]*?)<\/ul>/);
    if (constraintMatch) {
        const liMatches = constraintMatch[1].matchAll(/<li>(.+?)<\/li>/g);
        for (const match of liMatches) {
            constraints.push(match[1].replace(/<[^>]+>/g, '').trim());
        }
    }

    return { difficulty, description, constraints };
}

// Generate function name from problem name
function generateFunctionName(name) {
    return name.split('-').map((word, i) =>
        i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
}

// Generate problem.md content
function generateProblemMd(info, parsed) {
    return `# ${parseInt(info.id)}. ${info.title} (${parsed.difficulty})

## 题目描述

${parsed.description}

---

## 数据探针 (Data Probes)

### 需求探针 (Requirement Probes)

- **LC-Req-${info.id}-01**: 输入约束 - ${parsed.constraints[0] || 'TBD'}
- **LC-Req-${info.id}-02**: 输出要求 - 返回正确结果
- **LC-Req-${info.id}-03**: 边界条件 - 需要处理空输入和极端值

### 设计探针 (Design Probes)

- **LC-Design-${info.id}-01**: 算法选择 - 根据问题特性选择合适算法
- **LC-Design-${info.id}-02**: 数据结构 - 选择合适的数据结构优化性能
- **LC-Design-${info.id}-03**: 复杂度分析 - 时间复杂度和空间复杂度优化
`;
}

// Generate solution.ts content
function generateSolutionTs(info) {
    const funcName = generateFunctionName(info.name);
    return `/**
 * ${info.title}
 * @probe_ref LC-Design-${info.id}-01
 * @probe_ref LC-Design-${info.id}-02
 * @probe_ref LC-Design-${info.id}-03
 */
export function ${funcName}(...args: any[]): any {
    // TODO: 基于探针实现算法
    return null;
};
`;
}

// Generate solution.test.ts content
function generateTestTs(info) {
    const funcName = generateFunctionName(info.name);
    return `import { ${funcName} } from './solution';

describe('${parseInt(info.id)}. ${info.title}', () => {
    // 验证需求探针 LC-Req-${info.id}-01, LC-Req-${info.id}-02, LC-Req-${info.id}-03

    it('示例 1: 基本测试', () => {
        // TODO: 根据题目实现测试用例
        expect(true).toBe(true);
    });

    it('边界测试: 空输入', () => {
        // TODO: 实现边界测试
        expect(true).toBe(true);
    });

    it('边界测试: 极端值', () => {
        // TODO: 实现极端值测试
        expect(true).toBe(true);
    });
});
`;
}

// Process a single problem
function processProblem(folderName) {
    const problemDir = path.join(baseDir, 'problems', folderName);
    const rawMdPath = path.join(problemDir, 'raw.md');

    if (!fs.existsSync(rawMdPath)) {
        return { success: false, error: 'raw.md not found' };
    }

    const info = parseProblemFolder(folderName);
    if (!info) {
        return { success: false, error: 'Invalid folder name format' };
    }

    const rawContent = fs.readFileSync(rawMdPath, 'utf-8');
    const parsed = parseRawMd(rawContent);
    info.difficulty = parsed.difficulty;

    const files = [
        { name: 'problem.md', content: generateProblemMd(info, parsed) },
        { name: 'solution.ts', content: generateSolutionTs(info) },
        { name: 'solution.test.ts', content: generateTestTs(info) }
    ];

    let created = 0;
    let skipped = 0;

    for (const file of files) {
        const filePath = path.join(problemDir, file.name);
        if (fs.existsSync(filePath)) {
            skipped++;
        } else {
            fs.writeFileSync(filePath, file.content, 'utf-8');
            created++;
        }
    }

    return { success: true, created, skipped };
}

// Main
const folders = fs.readFileSync(batchFile, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

let totalCreated = 0;
let totalSkipped = 0;
let failed = 0;
const errors = [];

for (const folder of folders) {
    try {
        const result = processProblem(folder);
        if (result.success) {
            totalCreated += result.created;
            totalSkipped += result.skipped;
        } else {
            failed++;
            errors.push(`${folder}: ${result.error}`);
        }
    } catch (e) {
        failed++;
        errors.push(`${folder}: ${e.message}`);
    }
}

console.log('=== 处理结果 ===');
console.log(`题目总数: ${folders.length}`);
console.log(`新建文件: ${totalCreated}`);
console.log(`跳过(已存在): ${totalSkipped}`);
console.log(`失败: ${failed}`);

if (errors.length > 0) {
    console.log('\n错误详情:');
    errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
    if (errors.length > 10) {
        console.log(`  ... 还有 ${errors.length - 10} 个错误`);
    }
}
