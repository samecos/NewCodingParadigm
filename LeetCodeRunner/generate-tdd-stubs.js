const fs = require('fs');
const path = require('path');

const PROBLEMS_DIR = path.join(__dirname, 'problems');

// 解析 raw.md 文件，提取题目信息
function parseRawMd(content, folderName) {
    const result = {
        id: '',
        title: '',
        difficulty: 'Medium',
        description: '',
        examples: [],
        constraints: []
    };

    // 提取题号和标题
    const titleMatch = content.match(/#\s*(\d+)\.\s*(.+?)\s*\((Easy|Medium|Hard)\)/i);
    if (titleMatch) {
        result.id = titleMatch[1].padStart(4, '0');
        result.title = titleMatch[2].trim();
        result.difficulty = titleMatch[3];
    } else {
        // 从文件夹名提取题号
        const folderMatch = folderName.match(/(\d+)_(.+)/);
        if (folderMatch) {
            result.id = folderMatch[1].padStart(4, '0');
            result.title = folderMatch[2].replace(/-/g, ' ');
        }
    }

    // 提取题目描述（在"## 题目描述"和第一个"示例"或"---"之间）
    const descMatch = content.match(/##\s*题目描述\s*([\s\S]*?)(?=##\s*数据探针|##\s*示例|###\s*示例|<strong>示例|---|$)/i);
    if (descMatch) {
        result.description = descMatch[1].trim();
    }

    // 提取示例
    const exampleMatches = content.matchAll(/<strong>\s*示例\s*\d*[:：]?\s*<\/strong>\s*<\/p>?\s*<pre>([\s\S]*?)<\/pre>/gi);
    for (const match of exampleMatches) {
        result.examples.push(match[1].trim());
    }

    // 如果没有匹配到，尝试其他格式
    if (result.examples.length === 0) {
        const altExampleMatches = content.matchAll(/<strong\s*class="example">\s*示例\s*\d*[:：]?\s*<\/strong>\s*<\/p>?\s*<div[^>]*>\s*<p>([\s\S]*?)<\/div>/gi);
        for (const match of altExampleMatches) {
            result.examples.push(match[1].trim());
        }
    }

    // 提取约束条件
    const constraintsMatch = content.match(/<strong>\s*提示\s*[:：]?\s*<\/strong>\s*<\/p>?\s*<ul>([\s\S]*?)<\/ul>/i);
    if (constraintsMatch) {
        const constraintItems = constraintsMatch[1].match(/<li>([\s\S]*?)<\/li>/gi);
        if (constraintItems) {
            result.constraints = constraintItems.map(item =>
                item.replace(/<li>|<\/li>/gi, '').replace(/<code>|<\/code>/gi, '`').trim()
            );
        }
    }

    return result;
}

// 从文件夹名提取函数名
function getFunctionNameFromFolder(folderName) {
    const match = folderName.match(/\d+_(.+)/);
    if (match) {
        const name = match[1].replace(/-/g, '_');
        // 转换为 camelCase
        return name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }
    return 'solution';
}

// 从 solution.ts 提取函数签名
function extractFunctionSignature(solutionContent) {
    // 匹配函数声明
    const funcMatch = solutionContent.match(/function\s+(\w+)\s*\(([^)]*)\)\s*[:\s]*(\w+|\{[^}]*\}|\[[^\]]*\]|\w+\s*\|[^;]+)?/);
    if (funcMatch) {
        return {
            name: funcMatch[1],
            params: funcMatch[2].trim(),
            returnType: funcMatch[3] ? funcMatch[3].trim() : 'any'
        };
    }

    // 匹配箭头函数或变量声明
    const arrowMatch = solutionContent.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*[:=]\s*(?:\([^)]*\)|[^=]*)\s*=>/);
    if (arrowMatch) {
        return { name: arrowMatch[1], params: '', returnType: 'any' };
    }

    return null;
}

// 生成 problem.md
function generateProblemMd(info) {
    const id = info.id;
    const probes = [];

    // 根据题目类型生成需求探针
    probes.push(`- **LC-Req-${id}-01**: 输入数据类型和范围符合题目约束。`);
    probes.push(`- **LC-Req-${id}-02**: 输出格式符合题目要求。`);
    probes.push(`- **LC-Req-${id}-03**: 算法能够正确处理所有示例情况。`);

    // 生成设计探针
    const designProbes = [
        `- **LC-Design-${id}-01**: 时间复杂度应满足题目约束要求。`,
        `- **LC-Design-${id}-02**: 空间复杂度应尽可能优化。`,
        `- **LC-Design-${id}-03**: 边界条件处理正确（空输入、单元素、最大值等）。`
    ];

    return `# ${parseInt(id)}. ${info.title} (${info.difficulty})

## 题目描述

${info.description || '请参见原始题目描述。'}

---

## 数据探针 (Data Probes)

### 需求探针 (Requirement Probes)
${probes.join('\n')}

### 设计探针 (Design Probes)
${designProbes.join('\n')}
`;
}

// 生成 solution.test.ts
function generateTestTs(info, funcSignature) {
    const id = parseInt(info.id);
    const funcName = funcSignature ? funcSignature.name : getFunctionNameFromFolder(info.folderName);

    let testCases = '';
    if (info.examples.length > 0) {
        info.examples.forEach((ex, idx) => {
            testCases += `
    it('示例 ${idx + 1}', () => {
        // 请根据实际输入输出格式完善测试
        // ${ex.replace(/\n/g, ' ')}
        // TODO: 添加具体测试断言
    });`;
        });
    } else {
        testCases = `
    it('示例 1', () => {
        // TODO: 添加测试用例
    });`;
    }

    return `import { ${funcName} } from './solution';

describe('${id}. ${info.title}', () => {
    // 验证需求探针 LC-Req-${info.id}-01, LC-Req-${info.id}-02, LC-Req-${info.id}-03${testCases}

    it('边界测试: 空输入或最小输入', () => {
        // TODO: 添加边界测试
    });
});
`;
}

// 生成 solution.ts（如果不存在）
function generateSolutionTs(info, funcSignature) {
    const id = info.id;
    const funcName = funcSignature ? funcSignature.name : getFunctionNameFromFolder(info.folderName);
    const params = funcSignature ? funcSignature.params : '';
    const returnType = funcSignature ? funcSignature.returnType : 'any';

    return `/**
 * @probe_ref LC-Design-${id}-01
 * @probe_ref LC-Design-${id}-02
 * @probe_ref LC-Design-${id}-03
 */
export function ${funcName}(${params}): ${returnType} {
    // TODO: 基于探针实现算法
    return null as any;
};
`;
}

// 主函数
async function main() {
    const dirs = fs.readdirSync(PROBLEMS_DIR)
        .filter(name => /^\d+_/.test(name))
        .sort();

    let generated = 0;
    let skipped = 0;
    let errors = [];

    console.log(`Found ${dirs.length} problem directories`);

    for (const dir of dirs) {
        const problemPath = path.join(PROBLEMS_DIR, dir);
        const rawMdPath = path.join(problemPath, 'raw.md');
        const problemMdPath = path.join(problemPath, 'problem.md');
        const testPath = path.join(problemPath, 'solution.test.ts');
        const solutionPath = path.join(problemPath, 'solution.ts');

        // 如果 problem.md 已存在，跳过
        if (fs.existsSync(problemMdPath)) {
            skipped++;
            continue;
        }

        // 如果没有 raw.md，跳过
        if (!fs.existsSync(rawMdPath)) {
            errors.push(`${dir}: No raw.md found`);
            continue;
        }

        try {
            // 读取 raw.md
            const rawContent = fs.readFileSync(rawMdPath, 'utf-8');
            const info = parseRawMd(rawContent, dir);
            info.folderName = dir;

            // 读取现有 solution.ts（如果有）
            let funcSignature = null;
            if (fs.existsSync(solutionPath)) {
                const solutionContent = fs.readFileSync(solutionPath, 'utf-8');
                funcSignature = extractFunctionSignature(solutionContent);
            }

            // 生成 problem.md
            const problemMd = generateProblemMd(info);
            fs.writeFileSync(problemMdPath, problemMd, 'utf-8');

            // 生成 solution.test.ts
            const testTs = generateTestTs(info, funcSignature);
            fs.writeFileSync(testPath, testTs, 'utf-8');

            // 如果 solution.ts 不存在，生成它
            if (!fs.existsSync(solutionPath)) {
                const solutionTs = generateSolutionTs(info, funcSignature);
                fs.writeFileSync(solutionPath, solutionTs, 'utf-8');
            }

            console.log(`Generated: ${dir}`);
            generated++;

        } catch (err) {
            errors.push(`${dir}: ${err.message}`);
        }
    }

    console.log('\n=== Summary ===');
    console.log(`Generated: ${generated}`);
    console.log(`Skipped (already has problem.md): ${skipped}`);
    console.log(`Errors: ${errors.length}`);
    if (errors.length > 0) {
        console.log('\nErrors:');
        errors.forEach(e => console.log(`  - ${e}`));
    }
}

main().catch(console.error);
