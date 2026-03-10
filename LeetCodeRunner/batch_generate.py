#!/usr/bin/env python3
"""批量生成LeetCode题目的TDD桩文件"""

import os
import re
from pathlib import Path

def extract_problem_info(raw_content, problem_dir):
    """从raw.md内容提取题目信息"""
    # 提取题号
    problem_id = problem_dir.split('_')[0]

    # 提取标题和难度
    title_match = re.search(r'# (\d+)\.\s*(.+?)\s*\((\w+)\)', raw_content)
    if title_match:
        number = title_match.group(1)
        title = title_match.group(2).strip()
        difficulty = title_match.group(3)
    else:
        number = problem_id
        title = problem_dir.split('_', 1)[1].replace('-', ' ').title()
        difficulty = 'Medium'

    # 提取函数签名 - 尝试多种模式
    function_name = None
    params = None
    return_type = 'void'

    # 尝试匹配各种函数签名模式
    patterns = [
        # TypeScript/Java style: function name(params): returnType
        r'function\s+(\w+)\s*\(([^)]*)\)\s*:\s*(\w+)',
        # C++ style: returnType name(params)
        r'(\w+)\s+(\w+)\s*\(([^)]*)\)',
        # 从题目描述中提取
        r'\*\s*\*\s*(\w+)\s*\*\*\s*\(([^)]*)\)',
    ]

    for pattern in patterns:
        match = re.search(pattern, raw_content)
        if match:
            break

    # 如果没有找到函数签名，从目录名推断
    function_name = problem_dir.split('_', 1)[1].replace('-', '') if '_' in problem_dir else 'solution'

    return {
        'id': number if 'number' in dir() else problem_id,
        'title': title,
        'difficulty': difficulty,
        'function_name': function_name,
        'raw_content': raw_content
    }

def generate_problem_md(info, problem_dir):
    """生成problem.md"""
    problem_id = info['id']
    title = info['title']
    difficulty = info['difficulty']
    raw = info['raw_content']

    # 提取题目描述（简化版）
    desc_match = re.search(r'## 题目描述\s*\n\s*\n(.+?)(?=\n\s*##|\n\s*---|\Z)', raw, re.DOTALL)
    if desc_match:
        description = desc_match.group(1).strip()
        # 清理HTML标签
        description = re.sub(r'<[^>]+>', '', description)
        description = re.sub(r'&nbsp;', ' ', description)
        description = re.sub(r'&lt;', '<', description)
        description = re.sub(r'&gt;', '>', description)
        description = re.sub(r'&amp;', '&', description)
        description = re.sub(r'<code>([^<]+)</code>', r'`\1`', description)
        description = re.sub(r'<strong>([^<]+)</strong>', r'**\1**', description)
        description = re.sub(r'<p>|</p>', '\n', description)
        description = re.sub(r'<pre>|</pre>', '```', description)
        description = re.sub(r'<ul>|</ul>', '', description)
        description = re.sub(r'<li>', '- ', description)
        description = re.sub(r'</li>', '\n', description)
        description = re.sub(r'<sup>([^<]+)</sup>', r'^\1^', description)
        description = re.sub(r'\n\s*\n\s*\n', '\n\n', description)
    else:
        description = "请查看原始题目描述。"

    # 提取示例
    examples = []
    example_matches = re.findall(r'\*\*示例\s*\d+[：:]\*\*\s*\n\s*```\s*\n(.*?)\n\s*```', raw, re.DOTALL)
    for ex in example_matches:
        examples.append(ex.strip())

    # 生成需求探针
    probes = generate_probes(info, raw)

    content = f"""# {problem_id}. {title} ({difficulty})

## 题目描述

{description}

---

## 数据探针 (Data Probes)

### 需求探针 (Requirement Probes)

{probes['requirement']}

### 设计探针 (Design Probes)

{probes['design']}
"""
    return content

def generate_probes(info, raw):
    """生成数据探针"""
    problem_id = info['id']
    raw_lower = raw.lower()

    req_probes = []
    design_probes = []

    # 根据题目类型推断探针
    if 'array' in raw_lower or '数组' in raw:
        req_probes.append(f"- **LC-Req-{problem_id}-01**: 输入为数组，需要处理数组的遍历和访问。")
    if 'string' in raw_lower or '字符串' in raw or 'string' in raw_lower:
        req_probes.append(f"- **LC-Req-{problem_id}-02**: 输入为字符串，需要处理字符操作。")
    if 'tree' in raw_lower or '二叉树' in raw or 'binary tree' in raw_lower:
        req_probes.append(f"- **LC-Req-{problem_id}-03**: 涉及二叉树结构，需要处理树的遍历。")
    if 'graph' in raw_lower or '图' in raw:
        req_probes.append(f"- **LC-Req-{problem_id}-04**: 涉及图结构，需要处理图的遍历或搜索。")
    if 'dp' in raw_lower or 'dynamic' in raw_lower or '动态规划' in raw:
        req_probes.append(f"- **LC-Req-{problem_id}-05**: 需要使用动态规划求解最优解。")

    # 如果没有特定探针，添加通用探针
    if not req_probes:
        req_probes = [
            f"- **LC-Req-{problem_id}-01**: 理解题目输入输出要求。",
            f"- **LC-Req-{problem_id}-02**: 正确处理边界条件。",
            f"- **LC-Req-{problem_id}-03**: 确保算法满足时间和空间复杂度要求。"
        ]

    # 设计探针
    design_probes = [
        f"- **LC-Design-{problem_id}-01**: 分析题目要求，选择合适的数据结构。",
        f"- **LC-Design-{problem_id}-02**: 设计算法流程，处理各种边界情况。",
        f"- **LC-Design-{problem_id}-03**: 优化算法性能，满足复杂度要求。",
        f"- **LC-Design-{problem_id}-04**: 验证算法正确性。"
    ]

    return {
        'requirement': '\n'.join(req_probes),
        'design': '\n'.join(design_probes)
    }

def generate_solution_ts(info, problem_dir):
    """生成solution.ts"""
    problem_id = info['id']
    function_name = info['function_name']

    # 从目录名推断函数名（使用camelCase）
    parts = problem_dir.split('_')
    if len(parts) > 1:
        words = parts[1].split('-')
        function_name = words[0] + ''.join(w.capitalize() for w in words[1:])

    content = f"""/**
 * @probe_ref LC-Design-{problem_id}-01
 * @probe_ref LC-Design-{problem_id}-02
 * @probe_ref LC-Design-{problem_id}-03
 * @probe_ref LC-Design-{problem_id}-04
 */
export function {function_name}(/* TODO: 添加参数 */): any {{
    // TODO: 基于探针实现算法
    return null;
}};
"""
    return content

def generate_test_ts(info, problem_dir):
    """生成solution.test.ts"""
    problem_id = info['id']
    title = info['title']
    function_name = info['function_name']

    # 从目录名推断函数名
    parts = problem_dir.split('_')
    if len(parts) > 1:
        words = parts[1].split('-')
        function_name = words[0] + ''.join(w.capitalize() for w in words[1:])

    content = f"""import {{ {function_name} }} from './solution';

describe('{problem_id}. {title}', () => {{
    // 验证需求探针 LC-Req-{problem_id}-01, LC-Req-{problem_id}-02, LC-Req-{problem_id}-03

    it('示例 1: 基本测试用例', () => {{
        // TODO: 添加测试用例
        expect(true).toBe(true);
    }});

    it('边界测试: 空输入', () => {{
        // TODO: 添加边界测试
        expect(true).toBe(true);
    }});

    it('边界测试: 最大/最小值', () => {{
        // TODO: 添加边界测试
        expect(true).toBe(true);
    }});
}});
"""
    return content

def process_problem(problem_dir, base_path):
    """处理单个题目"""
    problem_path = Path(base_path) / 'problems' / problem_dir
    raw_file = problem_path / 'raw.md'

    if not raw_file.exists():
        return False, f"raw.md not found for {problem_dir}"

    # 读取raw.md
    raw_content = raw_file.read_text(encoding='utf-8')

    # 提取信息
    info = extract_problem_info(raw_content, problem_dir)

    # 检查文件是否已存在
    problem_md = problem_path / 'problem.md'
    solution_ts = problem_path / 'solution.ts'
    test_ts = problem_path / 'solution.test.ts'

    results = []

    # 生成problem.md
    if not problem_md.exists():
        content = generate_problem_md(info, problem_dir)
        problem_md.write_text(content, encoding='utf-8')
        results.append("problem.md created")
    else:
        results.append("problem.md skipped (exists)")

    # 生成solution.ts
    if not solution_ts.exists():
        content = generate_solution_ts(info, problem_dir)
        solution_ts.write_text(content, encoding='utf-8')
        results.append("solution.ts created")
    else:
        results.append("solution.ts skipped (exists)")

    # 生成solution.test.ts
    if not test_ts.exists():
        content = generate_test_ts(info, problem_dir)
        test_ts.write_text(content, encoding='utf-8')
        results.append("solution.test.ts created")
    else:
        results.append("solution.test.ts skipped (exists)")

    return True, results

def main():
    base_path = Path('D:/code/NewCodingParadigm/LeetCodeRunner')

    # 读取题目列表
    batch_file = Path('/tmp/batch_ae')
    if not batch_file.exists():
        # 尝试Windows路径
        batch_file = Path('D:/tmp/batch_ae')

    with open(batch_file, 'r', encoding='utf-8') as f:
        problems = [line.strip() for line in f if line.strip()]

    success_count = 0
    fail_count = 0
    fail_list = []

    for problem_dir in problems:
        try:
            success, msg = process_problem(problem_dir, base_path)
            if success:
                success_count += 1
                print(f"[OK] {problem_dir}: {msg}")
            else:
                fail_count += 1
                fail_list.append((problem_dir, msg))
                print(f"[FAIL] {problem_dir}: {msg}")
        except Exception as e:
            fail_count += 1
            fail_list.append((problem_dir, str(e)))
            print(f"[ERROR] {problem_dir}: {e}")

    print(f"\n=== 处理完成 ===")
    print(f"成功: {success_count}")
    print(f"失败: {fail_count}")
    if fail_list:
        print("\n失败列表:")
        for p, m in fail_list:
            print(f"  - {p}: {m}")

if __name__ == '__main__':
    main()
