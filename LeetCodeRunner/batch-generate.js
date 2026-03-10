const fs = require('fs');
const path = require('path');

// Parse raw.md content to extract problem info
function parseRawMd(content, problemId) {
    const lines = content.split('\n');

    // Extract title from first line
    const titleMatch = lines[0].match(/#\s*(\d+)\.\s*(.+?)\s*\((\w+)\)/);
    let title = '';
    let difficulty = '';
    if (titleMatch) {
        title = titleMatch[2].trim();
        difficulty = titleMatch[3].trim();
    }

    // Extract description
    let description = '';
    let inDescription = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('## 题目描述')) {
            inDescription = true;
            continue;
        }
        if (inDescription && line.startsWith('##')) {
            break;
        }
        if (inDescription && line.trim() && !line.includes('---')) {
            description += line + '\n';
        }
    }

    // Clean up description (remove HTML tags)
    description = description
        .replace(/<p>/g, '')
        .replace(/<\/p>/g, '')
        .replace(/<strong>/g, '**')
        .replace(/<\/strong>/g, '**')
        .replace(/<code>/g, '`')
        .replace(/<\/code>/g, '`')
        .replace(/<ul>/g, '')
        .replace(/<\/ul>/g, '')
        .replace(/<li>/g, '- ')
        .replace(/<\/li>/g, '')
        .replace(/<img[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"')
        .replace(/&hellip;/g, '...')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();

    // Extract examples
    const examples = [];
    let inExample = false;
    let currentExample = {};
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('示例')) {
            inExample = true;
            currentExample = {};
            continue;
        }
        if (inExample && line.startsWith('<pre>')) {
            continue;
        }
        if (inExample && line.startsWith('</pre>')) {
            examples.push(currentExample);
            inExample = false;
            continue;
        }
        if (inExample) {
            const inputMatch = line.match(/<strong>输入：<\/strong>(.+)/);
            const outputMatch = line.match(/<strong>输出：<\/strong>(.+)/);
            if (inputMatch) {
                currentExample.input = inputMatch[1].trim();
            }
            if (outputMatch) {
                currentExample.output = outputMatch[1].trim();
            }
        }
    }

    // Extract constraints
    const constraints = [];
    let inConstraints = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('提示：') || line.includes('Constraints:')) {
            inConstraints = true;
            continue;
        }
        if (inConstraints && line.startsWith('##')) {
            break;
        }
        if (inConstraints && line.trim() && line.includes('- ')) {
            const constraint = line.replace(/<li>/g, '').replace(/<\/li>/g, '').replace(/<code>/g, '`').replace(/<\/code>/g, '`').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
            if (constraint) {
                constraints.push(constraint);
            }
        }
    }

    // Extract function signature from description
    let functionName = '';
    let returnType = 'number';
    let params = [];

    // Try to find function name from examples
    for (const example of examples) {
        if (example.input) {
            const fnMatch = example.input.match(/(\w+)\s*=/);
            if (fnMatch) {
                functionName = fnMatch[1];
                break;
            }
        }
    }

    // If no function name found, generate from title
    if (!functionName) {
        functionName = title.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }

    // Parse params from example input
    if (examples.length > 0 && examples[0].input) {
        const inputStr = examples[0].input;
        const paramMatches = inputStr.match(/(\w+)\s*=/g);
        if (paramMatches) {
            params = paramMatches.map(m => {
                const name = m.replace('=', '').trim();
                // Infer type from name
                let type = 'number';
                if (name.includes('str') || name.includes('s') && !name.includes('nums')) {
                    type = 'string';
                } else if (name.includes('arr') || name.includes('list') || name.includes('nums')) {
                    type = 'number[]';
                } else if (name.includes('root') || name.includes('node') || name.includes('tree')) {
                    type = 'TreeNode | null';
                } else if (name.includes('head') || name.includes('l1') || name.includes('l2')) {
                    type = 'ListNode | null';
                }
                return { name, type };
            });
        }
    }

    // Infer return type from output
    if (examples.length > 0 && examples[0].output) {
        const output = examples[0].output;
        if (output.startsWith('[')) {
            returnType = 'number[]';
        } else if (output.startsWith('"') || output.startsWith("'")) {
            returnType = 'string';
        } else if (output === 'true' || output === 'false') {
            returnType = 'boolean';
        } else {
            returnType = 'number';
        }
    }

    return {
        id: problemId,
        title,
        difficulty,
        description,
        examples,
        constraints,
        functionName,
        returnType,
        params
    };
}

function generateProblemMd(problem) {
    const paddedId = problem.id.toString().padStart(4, '0');

    let probes = '';
    let probeIndex = 1;

    // Requirement probes
    probes += `### 需求探针 (Requirement Probes)\n\n`;
    problem.params.forEach((param, idx) => {
        probes += `- **LC-Req-${paddedId}-${String(probeIndex).padStart(2, '0')}**: 输入参数 \`${param.name}\` 为 ${param.type} 类型。\n`;
        probeIndex++;
    });
    probes += `- **LC-Req-${paddedId}-${String(probeIndex).padStart(2, '0')}**: 返回值为 ${problem.returnType} 类型。\n`;
    probeIndex++;

    // Design probes
    probes += `\n### 设计探针 (Design Probes)\n\n`;
    probes += `- **LC-Design-${paddedId}-01**: 待补充设计探针。\n`;

    return `# ${problem.id}. ${problem.title} (${problem.difficulty})

## 题目描述

${problem.description}

---

## 数据探针 (Data Probes)

${probes}
`;
}

function generateSolutionTs(problem) {
    const paddedId = problem.id.toString().padStart(4, '0');

    const paramsStr = problem.params.map(p => `${p.name}: ${p.type}`).join(', ');

    return `/**
 * ${problem.id}. ${problem.title}
 */

/**
 * @probe_ref LC-Design-${paddedId}-01
 */
export function ${problem.functionName}(${paramsStr}): ${problem.returnType} {
    // TODO: 基于探针实现算法
    ${problem.returnType.includes('[]') ? 'return [];' : problem.returnType === 'boolean' ? 'return false;' : problem.returnType === 'string' ? "return '';" : 'return 0;'}
};
`;
}

function generateTestTs(problem) {
    const paramsStr = problem.params.map(p => p.name).join(', ');
    const argsStr = problem.params.map(p => {
        if (p.type === 'number[]') {
            return `[${p.name}]`;
        }
        return p.name;
    }).join(', ');

    let testCases = '';
    problem.examples.forEach((ex, idx) => {
        if (ex.input && ex.output) {
            const inputValues = ex.input.split(',').map(s => s.trim());
            const args = inputValues.map(v => {
                const val = v.split('=')[1]?.trim() || v;
                return val;
            }).join(', ');

            testCases += `
    it('示例 ${idx + 1}: ${ex.input}', () => {
        const result = ${problem.functionName}(${args});
        expect(result).toEqual(${ex.output});
    });
`;
        }
    });

    return `import { ${problem.functionName} } from './solution';

describe('${problem.id}. ${problem.title}', () => {
${testCases}
});
`;
}

async function processBatch(batchFile, problemsDir) {
    const content = fs.readFileSync(batchFile, 'utf-8');
    const problems = content.trim().split('\n');

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const problemDir of problems) {
        const problemPath = path.join(problemsDir, problemDir);
        const rawMdPath = path.join(problemPath, 'raw.md');

        if (!fs.existsSync(rawMdPath)) {
            console.log(`Skipping ${problemDir}: raw.md not found`);
            failed++;
            continue;
        }

        // Extract problem ID from directory name
        const idMatch = problemDir.match(/^(\d+)_/);
        if (!idMatch) {
            console.log(`Skipping ${problemDir}: cannot extract ID`);
            failed++;
            continue;
        }
        const problemId = parseInt(idMatch[1]);

        // Check if files already exist
        const problemMdPath = path.join(problemPath, 'problem.md');
        const solutionTsPath = path.join(problemPath, 'solution.ts');
        const testTsPath = path.join(problemPath, 'solution.test.ts');

        if (fs.existsSync(problemMdPath) && fs.existsSync(solutionTsPath) && fs.existsSync(testTsPath)) {
            console.log(`Skipping ${problemDir}: files already exist`);
            skipped++;
            continue;
        }

        try {
            const rawContent = fs.readFileSync(rawMdPath, 'utf-8');
            const problem = parseRawMd(rawContent, problemId);

            // Generate files
            if (!fs.existsSync(problemMdPath)) {
                fs.writeFileSync(problemMdPath, generateProblemMd(problem));
            }
            if (!fs.existsSync(solutionTsPath)) {
                fs.writeFileSync(solutionTsPath, generateSolutionTs(problem));
            }
            if (!fs.existsSync(testTsPath)) {
                fs.writeFileSync(testTsPath, generateTestTs(problem));
            }

            console.log(`Generated files for ${problemDir}`);
            success++;
        } catch (err) {
            console.log(`Error processing ${problemDir}: ${err.message}`);
            failed++;
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Success: ${success}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);
}

// Main
const batchFile = process.argv[2] || '/tmp/batch_ag';
const problemsDir = process.argv[3] || path.join(__dirname, 'problems');

processBatch(batchFile, problemsDir);
