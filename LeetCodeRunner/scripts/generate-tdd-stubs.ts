import * as fs from 'fs';
import * as path from 'path';

interface ProblemInfo {
    id: string;
    name: string;
    folder: string;
    difficulty: string;
    title: string;
}

function parseProblemFolder(folderName: string): ProblemInfo {
    const match = folderName.match(/^(\d{4})_(.+)$/);
    if (!match) {
        throw new Error(`Invalid folder name format: ${folderName}`);
    }
    const [, num, name] = match;
    return {
        id: num,
        name: name,
        folder: folderName,
        difficulty: 'Medium', // Will be parsed from raw.md
        title: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    };
}

function parseRawMd(content: string): { difficulty: string; description: string; examples: string[]; constraints: string[] } {
    // Extract difficulty
    const difficultyMatch = content.match(/\((Easy|Medium|Hard)\)/);
    const difficulty = difficultyMatch ? difficultyMatch[1] : 'Medium';

    // Extract description (simplified)
    const descMatch = content.match(/<p>(.+?)<\/p>/s);
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // Extract examples
    const examples: string[] = [];
    const exampleMatches = content.matchAll(/<strong>示例\s*\d*[：:]?<\/strong>\s*<pre>([\s\S]*?)<\/pre>/g);
    for (const match of exampleMatches) {
        examples.push(match[1].trim());
    }

    // Extract constraints
    const constraints: string[] = [];
    const constraintMatch = content.match(/<strong>提示：?<\/strong>\s*<ul>([\s\S]*?)<\/ul>/);
    if (constraintMatch) {
        const liMatches = constraintMatch[1].matchAll(/<li>(.+?)<\/li>/g);
        for (const match of liMatches) {
            constraints.push(match[1].replace(/<[^>]+>/g, '').trim());
        }
    }

    return { difficulty, description, examples, constraints };
}

function generateFunctionName(name: string): string {
    return name
        .split('-')
        .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

function generateProblemMd(info: ProblemInfo, parsed: any): string {
    const difficultyCn = parsed.difficulty === 'Easy' ? '简单' : parsed.difficulty === 'Hard' ? '困难' : '中等';

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

function generateSolutionTs(info: ProblemInfo): string {
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

function generateTestTs(info: ProblemInfo): string {
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

async function processProblem(folderName: string, baseDir: string): Promise<{ success: boolean; skipped: boolean; error?: string }> {
    const problemDir = path.join(baseDir, 'problems', folderName);
    const rawMdPath = path.join(problemDir, 'raw.md');

    // Check if raw.md exists
    if (!fs.existsSync(rawMdPath)) {
        return { success: false, skipped: false, error: 'raw.md not found' };
    }

    const info = parseProblemFolder(folderName);
    const rawContent = fs.readFileSync(rawMdPath, 'utf-8');
    const parsed = parseRawMd(rawContent);

    // Update info with parsed data
    info.difficulty = parsed.difficulty;

    const files = [
        { name: 'problem.md', content: generateProblemMd(info, parsed) },
        { name: 'solution.ts', content: generateSolutionTs(info) },
        { name: 'solution.test.ts', content: generateTestTs(info) }
    ];

    let skipped = false;
    for (const file of files) {
        const filePath = path.join(problemDir, file.name);
        if (fs.existsSync(filePath)) {
            skipped = true;
            continue;
        }
        fs.writeFileSync(filePath, file.content, 'utf-8');
    }

    return { success: true, skipped };
}

async function main() {
    const baseDir = 'D:/code/NewCodingParadigm/LeetCodeRunner';
    const batchFile = '/tmp/batch_ab';

    const folders = fs.readFileSync(batchFile, 'utf-8')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const folder of folders) {
        try {
            const result = await processProblem(folder, baseDir);
            if (result.success) {
                if (result.skipped) {
                    skipped++;
                } else {
                    success++;
                }
            } else {
                failed++;
                errors.push(`${folder}: ${result.error}`);
            }
        } catch (e: any) {
            failed++;
            errors.push(`${folder}: ${e.message}`);
        }
    }

    console.log(`\n=== 处理结果 ===`);
    console.log(`成功: ${success}`);
    console.log(`跳过(已存在): ${skipped}`);
    console.log(`失败: ${failed}`);

    if (errors.length > 0) {
        console.log(`\n错误详情:`);
        errors.forEach(e => console.log(`  - ${e}`));
    }
}

main();
