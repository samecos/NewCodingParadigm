import * as fs from 'fs';
import * as path from 'path';

// 题目列表
const problems = [
"1287_element-appearing-more-than-25-in-sorted-array",
"1288_remove-covered-intervals",
"1289_minimum-falling-path-sum-ii",
"1290_convert-binary-number-in-a-linked-list-to-integer",
"1291_sequential-digits",
"1292_maximum-side-length-of-a-square-with-sum-less-than-or-equal-to-threshold",
"1293_shortest-path-in-a-grid-with-obstacles-elimination",
"1294_weather-type-in-each-country",
"1295_find-numbers-with-even-number-of-digits",
"1296_divide-array-in-sets-of-k-consecutive-numbers",
"1297_maximum-number-of-occurrences-of-a-substring",
"1298_maximum-candies-you-can-get-from-boxes",
"1299_replace-elements-with-greatest-element-on-right-side",
"1300_sum-of-mutated-array-closest-to-target",
"1301_number-of-paths-with-max-score",
"1302_deepest-leaves-sum",
"1303_find-the-team-size",
"1304_find-n-unique-integers-sum-up-to-zero",
"1305_all-elements-in-two-binary-search-trees",
"1306_jump-game-iii",
"1307_verbal-arithmetic-puzzle",
"1308_running-total-for-different-genders",
"1309_decrypt-string-from-alphabet-to-integer-mapping",
"1310_xor-queries-of-a-subarray",
"1311_get-watched-videos-by-your-friends",
"1312_minimum-insertion-steps-to-make-a-string-palindrome",
"1313_decompress-run-length-encoded-list",
"1314_matrix-block-sum",
"1315_sum-of-nodes-with-even-valued-grandparent",
"1316_distinct-echo-substrings",
"1317_convert-integer-to-the-sum-of-two-no-zero-integers",
"1318_minimum-flips-to-make-a-or-b-equal-to-c",
"1319_number-of-operations-to-make-network-connected",
"1320_minimum-distance-to-type-a-word-using-two-fingers",
"1321_restaurant-growth",
"1322_ads-performance",
"1323_maximum-69-number",
"1324_print-words-vertically",
"1325_delete-leaves-with-a-given-value",
"1326_minimum-number-of-taps-to-open-to-water-a-garden",
"1327_list-the-products-ordered-in-a-period",
"1328_break-a-palindrome",
"1329_sort-the-matrix-diagonally",
"1330_reverse-subarray-to-maximize-array-value",
"1331_rank-transform-of-an-array",
"1332_remove-palindromic-subsequences",
"1333_filter-restaurants-by-vegan-friendly-price-and-distance",
"1334_find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance",
"1335_minimum-difficulty-of-a-job-schedule",
"1336_number-of-transactions-per-visit",
"1337_the-k-weakest-rows-in-a-matrix",
"1338_reduce-array-size-to-the-half",
"1339_maximum-product-of-splitted-binary-tree",
"1340_jump-game-v",
"1341_movie-rating",
"1342_number-of-steps-to-reduce-a-number-to-zero",
"1343_number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold",
"1344_angle-between-hands-of-a-clock",
"1345_jump-game-iv",
"1346_check-if-n-and-its-double-exist",
"1347_minimum-number-of-steps-to-make-two-strings-anagram",
"1348_tweet-counts-per-frequency",
"1349_maximum-students-taking-exam",
"1350_students-with-invalid-departments",
"1351_count-negative-numbers-in-a-sorted-matrix",
"1352_product-of-the-last-k-numbers",
"1353_maximum-number-of-events-that-can-be-attended",
"1354_construct-target-array-with-multiple-sums",
"1355_activity-participants",
"1356_sort-integers-by-the-number-of-1-bits",
"1357_apply-discount-every-n-orders",
"1358_number-of-substrings-containing-all-three-characters",
"1359_count-all-valid-pickup-and-delivery-options",
"1360_number-of-days-between-two-dates",
"1361_validate-binary-tree-nodes",
"1362_closest-divisors",
"1363_largest-multiple-of-three",
"1364_number-of-trusted-contacts-of-a-customer",
"1365_how-many-numbers-are-smaller-than-the-current-number",
"1366_rank-teams-by-votes",
"1367_linked-list-in-binary-tree",
"1368_minimum-cost-to-make-at-least-one-valid-path-in-a-grid",
"1369_get-the-second-most-recent-activity",
"1370_increasing-decreasing-string",
"1371_find-the-longest-substring-containing-vowels-in-even-counts",
"1372_longest-zigzag-path-in-a-binary-tree",
"1373_maximum-sum-bst-in-binary-tree",
"1374_generate-a-string-with-characters-that-have-odd-counts",
"1375_number-of-times-binary-string-is-prefix-aligned",
"1376_time-needed-to-inform-all-employees",
"1377_frog-position-after-t-seconds",
"1378_replace-employee-id-with-the-unique-identifier",
"1379_find-a-corresponding-node-of-a-binary-tree-in-a-clone-of-that-tree",
"1380_lucky-numbers-in-a-matrix",
"1381_design-a-stack-with-increment-operation",
"1382_balance-a-binary-search-tree",
"1383_maximum-performance-of-a-team",
"1384_total-sales-amount-by-year",
"1385_find-the-distance-value-between-two-arrays",
"1386_cinema-seat-allocation",
"1387_sort-integers-by-the-power-value",
"1388_pizza-with-3n-slices",
"1389_create-target-array-in-the-given-order",
"1390_four-divisors",
"1391_check-if-there-is-a-valid-path-in-a-grid",
"1392_longest-happy-prefix",
"1393_capital-gainloss",
"1394_find-lucky-integer-in-an-array",
"1395_count-number-of-teams",
"1396_design-underground-system",
"1397_find-all-good-strings",
"1398_customers-who-bought-products-a-and-b-but-not-c",
"1399_count-largest-group",
"1400_construct-k-palindrome-strings",
"1401_circle-and-rectangle-overlapping",
"1402_reducing-dishes",
"1403_minimum-subsequence-in-non-increasing-order",
"1404_number-of-steps-to-reduce-a-number-in-binary-representation-to-one",
"1405_longest-happy-string",
"1406_stone-game-iii",
"1407_top-travellers",
"1408_string-matching-in-an-array",
"1409_queries-on-a-permutation-with-key",
"1410_html-entity-parser",
"1411_number-of-ways-to-paint-n-3-grid",
"1412_find-the-quiet-students-in-all-exams",
"1413_minimum-value-to-get-positive-step-by-step-sum",
"1414_find-the-minimum-number-of-fibonacci-numbers-whose-sum-is-k",
"1415_the-k-th-lexicographical-string-of-all-happy-strings-of-length-n",
"1416_restore-the-array",
"1417_reformat-the-string",
"1418_display-table-of-food-orders-in-a-restaurant",
"1419_minimum-number-of-frogs-croaking",
"1420_build-array-where-you-can-find-the-maximum-exactly-k-comparisons",
"1421_npv-queries",
"1422_maximum-score-after-splitting-a-string",
"1423_maximum-points-you-can-obtain-from-cards",
"1424_diagonal-traverse-ii",
"1425_constrained-subsequence-sum",
"1426_counting-elements",
"1427_perform-string-shifts",
"1428_leftmost-column-with-at-least-a-one",
"1429_first-unique-number",
"1430_check-if-a-string-is-a-valid-sequence-from-root-to-leaves-path-in-a-binary-tree",
"1431_kids-with-the-greatest-number-of-candies",
"1432_max-difference-you-can-get-from-changing-an-integer",
"1433_check-if-a-string-can-break-another-string",
"1434_number-of-ways-to-wear-different-hats-to-each-other",
"1435_create-a-session-bar-chart",
"1436_destination-city",
"1437_check-if-all-1s-are-at-least-length-k-places-away",
"1438_longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit",
"1439_find-the-kth-smallest-sum-of-a-matrix-with-sorted-rows",
"1440_evaluate-boolean-expression",
"1441_build-an-array-with-stack-operations",
"1442_count-triplets-that-can-form-two-arrays-of-equal-xor",
"1443_minimum-time-to-collect-all-apples-in-a-tree",
"1444_number-of-ways-of-cutting-a-pizza",
"1445_apples-oranges",
"1446_consecutive-characters",
"1447_simplified-fractions",
"1448_count-good-nodes-in-binary-tree",
"1449_form-largest-integer-with-digits-that-add-up-to-target",
"1450_number-of-students-doing-homework-at-a-given-time",
"1451_rearrange-words-in-a-sentence",
"1452_people-whose-list-of-favorite-companies-is-not-a-subset-of-another-list",
"1453_maximum-number-of-darts-inside-of-a-circular-dartboard",
"1454_active-users",
"1455_check-if-a-word-occurs-as-a-prefix-of-any-word-in-a-sentence",
"1456_maximum-number-of-vowels-in-a-substring-of-given-length",
"1457_pseudo-palindromic-paths-in-a-binary-tree",
"1458_max-dot-product-of-two-subsequences",
"1459_rectangles-area",
"1460_make-two-arrays-equal-by-reversing-subarrays",
"1461_check-if-a-string-contains-all-binary-codes-of-size-k",
"1462_course-schedule-iv",
"1463_cherry-pickup-ii",
"1464_maximum-product-of-two-elements-in-an-array",
"1465_maximum-area-of-a-piece-of-cake-after-horizontal-and-vertical-cuts",
"1466_reorder-routes-to-make-all-paths-lead-to-the-city-zero",
"1467_probability-of-a-two-boxes-having-the-same-number-of-distinct-balls",
"1468_calculate-salaries",
"1469_find-all-the-lonely-nodes"
];

interface ParseResult {
  problemNumber: string;
  title: string;
  difficulty: string;
  description: string;
  examples: Array<{input: string; output: string; explanation?: string}>;
  constraints: string[];
  isSQL: boolean;
}

function parseRawMd(content: string): ParseResult {
  const lines = content.split('\n');

  // 解析标题行
  const titleMatch = lines[0]?.match(/#\s*(\d+)\.\s*(.+?)\s*\((Easy|Medium|Hard)\)/);
  const problemNumber = titleMatch?.[1] || '0000';
  const title = titleMatch?.[2]?.trim() || 'Unknown';
  const difficulty = titleMatch?.[3] || 'Medium';

  // 检查是否是SQL题目（描述为null或包含表结构）
  const isSQL = content.includes('表:') || content.includes('Table:') ||
                content.includes('null') && content.split('\n').slice(0, 10).join('').includes('null');

  // 提取描述（从题目描述到第一个示例或提示之间）
  let description = '';
  let inDescription = false;
  for (const line of lines) {
    if (line.includes('## 题目描述')) {
      inDescription = true;
      continue;
    }
    if (line.includes('<strong>示例') || line.includes('<strong>示例') || line.includes('提示：')) {
      break;
    }
    if (inDescription) {
      description += line + '\n';
    }
  }
  description = description.replace(/<p>|<\/p>|<code>|<\/code>/g, '').trim();
  if (description === 'null') {
    description = '（SQL题目，详见原始描述）';
  }

  // 提取示例
  const examples: Array<{input: string; output: string; explanation?: string}> = [];
  const exampleMatches = content.match(/<strong>输入[：:]\s*<\/strong>([\s\S]*?)<strong>输出[：:]\s*<\/strong>([\s\S]*?)(?:<strong>解释[：:]\s*<\/strong>([\s\S]*?))?(?=<\/pre>|<p><strong>示例|$)/g);

  if (exampleMatches) {
    for (const match of exampleMatches) {
      const inputMatch = match.match(/<strong>输入[：:]\s*<\/strong>([\s\S]*?)(?=<strong>输出|$)/);
      const outputMatch = match.match(/<strong>输出[：:]\s*<\/strong>([\s\S]*?)(?=<strong>解释|<\/pre>|$)/);
      const explanationMatch = match.match(/<strong>解释[：:]\s*<\/strong>([\s\S]*?)(?=<\/pre>|$)/);

      if (inputMatch && outputMatch) {
        examples.push({
          input: inputMatch[1].replace(/<[^>]+>/g, '').trim(),
          output: outputMatch[1].replace(/<[^>]+>/g, '').trim(),
          explanation: explanationMatch?.[1]?.replace(/<[^>]+>/g, '').trim()
        });
      }
    }
  }

  // 提取约束条件
  const constraints: string[] = [];
  const constraintMatch = content.match(/<strong>提示[：:]\s*<\/strong>[\s\S]*?<ul>([\s\S]*?)<\/ul>/);
  if (constraintMatch) {
    const liMatches = constraintMatch[1].match(/<li>([\s\S]*?)<\/li>/g);
    if (liMatches) {
      for (const li of liMatches) {
        const text = li.replace(/<[^>]+>/g, '').trim();
        if (text) constraints.push(text);
      }
    }
  }

  return { problemNumber, title, difficulty, description, examples, constraints, isSQL };
}

function toPascalCase(str: string): string {
  return str.replace(/[-_](.)/g, (_, char) => char.toUpperCase())
            .replace(/^(.)/, (_, char) => char.toUpperCase());
}

function toCamelCase(str: string): string {
  return str.replace(/[-_](.)/g, (_, char) => char.toUpperCase());
}

function generateFunctionName(problemName: string): string {
  // 从 problem slug 生成函数名
  const parts = problemName.split('_').slice(1); // 去掉题号
  return toCamelCase(parts.join('_'));
}

function generateProblemMd(parsed: ParseResult, problemSlug: string): string {
  const probes = [];
  const designProbes = [];

  // 生成需求探针
  probes.push(`- **LC-Req-${parsed.problemNumber}-01**: ${parsed.description.substring(0, 100)}${parsed.description.length > 100 ? '...' : ''}`);

  if (parsed.constraints.length > 0) {
    probes.push(`- **LC-Req-${parsed.problemNumber}-02**: 约束条件包括 ${parsed.constraints.slice(0, 2).join('、')}`);
  }

  // 生成设计探针
  designProbes.push(`- **LC-Design-${parsed.problemNumber}-01**: 理解题目要求，明确输入输出格式。`);
  designProbes.push(`- **LC-Design-${parsed.problemNumber}-02**: 设计算法解决${parsed.title}问题。`);

  return `# ${parsed.problemNumber}. ${parsed.title} (${parsed.difficulty})

## 题目描述

${parsed.description}

---

## 数据探针 (Data Probes)

### 需求探针 (Requirement Probes)

${probes.join('\n')}

### 设计探针 (Design Probes)

${designProbes.join('\n')}
`;
}

function generateSolutionTs(parsed: ParseResult, problemSlug: string): string {
  const functionName = generateFunctionName(problemSlug);

  if (parsed.isSQL) {
    return `/**
 * ${parsed.problemNumber}. ${parsed.title}
 *
 * @probe_ref LC-Design-${parsed.problemNumber}-01
 * @probe_ref LC-Design-${parsed.problemNumber}-02
 */
export function ${functionName}(): string {
    // TODO: SQL题目，返回SQL语句
    return '';
};
`;
  }

  // 根据示例推断参数类型
  let params = 'input: unknown';
  let returnType = 'unknown';

  if (parsed.examples.length > 0) {
    const firstExample = parsed.examples[0];
    const input = firstExample.input;
    const output = firstExample.output;

    // 简单类型推断
    if (input.includes('[') && input.includes(']')) {
      if (input.includes('=')) {
        // 多个参数
        const paramPairs = input.split(',').map(p => p.trim());
        params = paramPairs.map((p, i) => {
          const [name, val] = p.split('=').map(s => s.trim());
          if (val?.includes('[')) return `${name}: number[]`;
          if (val?.match(/^["']/)) return `${name}: string`;
          return `${name}: number`;
        }).join(', ');
      } else {
        // 单个数组参数
        params = 'arr: number[]';
      }
    } else if (input.includes('"') || input.includes("'")) {
      params = 's: string';
    }

    // 推断返回类型
    if (output.includes('[')) {
      returnType = 'number[]';
    } else if (output === 'true' || output === 'false') {
      returnType = 'boolean';
    } else if (!isNaN(Number(output))) {
      returnType = 'number';
    } else {
      returnType = 'string';
    }
  }

  return `/**
 * ${parsed.problemNumber}. ${parsed.title}
 *
 * @probe_ref LC-Design-${parsed.problemNumber}-01
 * @probe_ref LC-Design-${parsed.problemNumber}-02
 */
export function ${functionName}(${params}): ${returnType} {
    // TODO: 基于探针实现算法
    ${returnType === 'number' ? 'return 0;' : returnType === 'boolean' ? 'return false;' : returnType === 'string' ? "return '';" : 'return [];'}
};
`;
}

function generateTestTs(parsed: ParseResult, problemSlug: string): string {
  const functionName = generateFunctionName(problemSlug);

  let imports = `import { ${functionName} } from './solution';`;
  let testCases = '';

  // 生成测试用例
  parsed.examples.forEach((ex, idx) => {
    const testNum = idx + 1;
    testCases += `
    it('示例 ${testNum}: ${ex.input.substring(0, 50)}${ex.input.length > 50 ? '...' : ''}', () => {
        // LC-Req-${parsed.problemNumber}-0${testNum}
        const result = ${functionName}(${ex.input.includes('=') ? ex.input.split(',').map(p => p.split('=')[1].trim()).join(', ') : ex.input});
        expect(result).toEqual(${ex.output});
    });`;
  });

  if (parsed.examples.length === 0) {
    testCases = `
    it('示例 1: 基本测试', () => {
        // LC-Req-${parsed.problemNumber}-01
        const result = ${functionName}();
        expect(result).toBeDefined();
    });`;
  }

  return `${imports}

describe('${parsed.problemNumber}. ${parsed.title}', () => {
    ${testCases}
});
`;
}

// 主处理函数
async function main() {
  const baseDir = path.join(__dirname, '..', 'problems');
  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const problem of problems) {
    const problemDir = path.join(baseDir, problem);
    const rawMdPath = path.join(problemDir, 'raw.md');

    // 检查 raw.md 是否存在
    if (!fs.existsSync(rawMdPath)) {
      console.log(`跳过 ${problem}: raw.md 不存在`);
      skipped++;
      continue;
    }

    // 检查目标文件是否已存在
    const problemMdPath = path.join(problemDir, 'problem.md');
    const solutionTsPath = path.join(problemDir, 'solution.ts');
    const testTsPath = path.join(problemDir, 'solution.test.ts');

    const allExist = fs.existsSync(problemMdPath) && fs.existsSync(solutionTsPath) && fs.existsSync(testTsPath);
    if (allExist) {
      console.log(`跳过 ${problem}: 文件已存在`);
      skipped++;
      continue;
    }

    try {
      // 读取并解析 raw.md
      const rawContent = fs.readFileSync(rawMdPath, 'utf-8');
      const parsed = parseRawMd(rawContent);

      // 生成文件内容
      if (!fs.existsSync(problemMdPath)) {
        const problemMd = generateProblemMd(parsed, problem);
        fs.writeFileSync(problemMdPath, problemMd);
      }

      if (!fs.existsSync(solutionTsPath)) {
        const solutionTs = generateSolutionTs(parsed, problem);
        fs.writeFileSync(solutionTsPath, solutionTs);
      }

      if (!fs.existsSync(testTsPath)) {
        const testTs = generateTestTs(parsed, problem);
        fs.writeFileSync(testTsPath, testTs);
      }

      console.log(`成功 ${problem}`);
      success++;
    } catch (err) {
      console.error(`失败 ${problem}:`, err);
      failed++;
    }
  }

  console.log(`\n处理完成:`);
  console.log(`  成功: ${success}`);
  console.log(`  跳过: ${skipped}`);
  console.log(`  失败: ${failed}`);
}

main().catch(console.error);
