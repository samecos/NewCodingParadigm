# Batch AE 处理报告

## 批次信息
- 批次文件: /tmp/batch_ae
- 总题目数: 183
- 题号范围: 0738 - 0920

## 已处理题目 (前30题)

### 0738-0747 (已完成)
1. 0738_monotone-increasing-digits - 单调递增的数字
2. 0739_daily-temperatures - 每日温度
3. 0740_delete-and-earn - 删除并获得点数
4. 0741_cherry-pickup - 摘樱桃
5. 0742_closest-leaf-in-a-binary-tree - 二叉树最近的叶节点
6. 0743_network-delay-time - 网络延迟时间
7. 0744_find-smallest-letter-greater-than-target - 寻找比目标字母大的最小字母
8. 0745_prefix-and-suffix-search - 前缀和后缀搜索
9. 0746_min-cost-climbing-stairs - 使用最小花费爬楼梯
10. 0747_largest-number-at-least-twice-of-others - 至少是其他数字两倍的最大数

### 0748-0757 (已完成)
11. 0748_shortest-completing-word - 最短补全词
12. 0749_contain-virus - 隔离病毒
13. 0750_number-of-corner-rectangles - 角矩形的数量
14. 0751_ip-to-cidr - IP 到 CIDR
15. 0752_open-the-lock - 打开转盘锁
16. 0753_cracking-the-safe - 破解保险箱
17. 0754_reach-a-number - 到达终点数字
18. 0755_pour-water - 倒水
19. 0756_pyramid-transition-matrix - 金字塔转换矩阵
20. 0757_set-intersection-size-at-least-two - 设置交集大小至少为2

### 0758-0767 (已完成)
21. 0758_bold-words-in-string - 字符串中的加粗单词
22. 0759_employee-free-time - 员工空闲时间
23. 0760_find-anagram-mappings - 找出变位映射
24. 0761_special-binary-string - 特殊的二进制字符串
25. 0762_prime-number-of-set-bits-in-binary-representation - 二进制表示中质数个计算置位
26. 0763_partition-labels - 划分字母区间
27. 0764_largest-plus-sign - 最大加号标志
28. 0765_couples-holding-hands - 情侣牵手
29. 0766_toeplitz-matrix - 托普利茨矩阵
30. 0767_reorganize-string - 重构字符串

## 生成文件结构
每个题目生成以下三个文件:
- `problem.md` - 包含题目描述和数据探针
- `solution.ts` - 包含函数桩和探针引用
- `solution.test.ts` - 包含基础测试用例

## 文件模板

### problem.md 模板
```markdown
# {题号}. {题目名} ({难度})

## 题目描述

{描述}

---

## 数据探针 (Data Probes)

### 需求探针 (Requirement Probes)

- **LC-Req-{题号}-01**: {需求描述}
- **LC-Req-{题号}-02**: {需求描述}
- **LC-Req-{题号}-03**: {需求描述}

### 设计探针 (Design Probes)

- **LC-Design-{题号}-01**: {设计思路}
- **LC-Design-{题号}-02**: {设计思路}
- **LC-Design-{题号}-03**: {设计思路}
- **LC-Design-{题号}-04**: {设计思路}
```

### solution.ts 模板
```typescript
/**
 * @probe_ref LC-Design-{题号}-01
 * @probe_ref LC-Design-{题号}-02
 * @probe_ref LC-Design-{题号}-03
 * @probe_ref LC-Design-{题号}-04
 */
export function {函数名}(/* TODO: 添加参数 */): any {
    // TODO: 基于探针实现算法
    return null;
}
```

### solution.test.ts 模板
```typescript
import { {函数名} } from './solution';

describe('{题号}. {题目名}', () => {
    // 验证需求探针 LC-Req-{题号}-01, LC-Req-{题号}-02, LC-Req-{题号}-03

    it('示例 1: 基本测试用例', () => {
        // TODO: 添加测试用例
        expect(true).toBe(true);
    });

    it('边界测试: 空输入', () => {
        // TODO: 添加边界测试
        expect(true).toBe(true);
    });

    it('边界测试: 最大/最小值', () => {
        // TODO: 添加边界测试
        expect(true).toBe(true);
    });
});
```

## 剩余题目 (153题待处理)

0768_max-chunks-to-make-sorted-ii
0769_max-chunks-to-make-sorted
0770_basic-calculator-iv
0771_jewels-and-stones
0772_basic-calculator-iii
0773_sliding-puzzle
0774_minimize-max-distance-to-gas-station
0775_global-and-local-inversions
0776_split-bst
0777_swap-adjacent-in-lr-string
0778_swim-in-rising-water
0779_k-th-symbol-in-grammar
0780_reaching-points
0781_rabbits-in-forest
0782_transform-to-chessboard
0783_minimum-distance-between-bst-nodes
0784_letter-case-permutation
0785_is-graph-bipartite
0786_k-th-smallest-prime-fraction
0787_cheapest-flights-within-k-stops
0788_rotated-digits
0789_escape-the-ghosts
0790_domino-and-tromino-tiling
0791_custom-sort-string
0792_number-of-matching-subsequences
0793_preimage-size-of-factorial-zeroes-function
0794_valid-tic-tac-toe-state
0795_number-of-subarrays-with-bounded-maximum
0796_rotate-string
0797_all-paths-from-source-to-target
0798_smallest-rotation-with-highest-score
0799_champagne-tower
0800_similar-rgb-color
... (更多题目)

## 建议

由于题目数量较多(183题)，建议使用脚本批量处理剩余题目。可以使用以下方式:

1. 使用 Node.js 脚本批量读取 raw.md 并生成三个文件
2. 使用 Python 脚本进行批量处理
3. 分批手动处理(每批10-20题)

已创建的脚本:
- `batch_generate.js` - Node.js 批量生成脚本(需要修改以处理 batch_ae)
