-- ============================================================
-- Seed: 10 problems with starter_code, test_cases, constraints, function_signature
-- Uses ON CONFLICT to upsert by problem number
-- ============================================================

-- Two Sum (#1)
insert into public.problems (number, title, difficulty, topics, starter_code, test_cases, constraints, function_signature)
values (
  1,
  'Two Sum',
  'Easy',
  '{"array","hash-map"}',
  '{"python": "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # your code here\n        pass", "javascript": "class Solution {\n  twoSum(nums, target) {\n    // your code here\n  }\n}"}',
  '[
    {"input": "{\"nums\":[2,7,11,15],\"target\":9}", "expected_output": "[0,1]", "sample": true},
    {"input": "{\"nums\":[3,2,4],\"target\":6}", "expected_output": "[1,2]", "sample": true},
    {"input": "{\"nums\":[3,3],\"target\":6}", "expected_output": "[0,1]", "sample": true},
    {"input": "{\"nums\":[1,5,3,7,2],\"target\":10}", "expected_output": "[2,3]", "sample": false},
    {"input": "{\"nums\":[0,4,3,0],\"target\":0}", "expected_output": "[0,3]", "sample": false},
    {"input": "{\"nums\":[-1,-2,-3,-4,-5],\"target\":-8}", "expected_output": "[2,4]", "sample": false},
    {"input": "{\"nums\":[10,20,30,40,50],\"target\":60}", "expected_output": "[1,3]", "sample": false},
    {"input": "{\"nums\":[1,2,3,4,5,6,7,8,9,10],\"target\":17}", "expected_output": "[7,8]", "sample": false}
  ]'::jsonb,
  '{"2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9", "Only one valid answer exists."}',
  '{"name": "twoSum", "params": [{"name": "nums", "type": "int[]"}, {"name": "target", "type": "int"}]}'
)
on conflict (number) do update set
  starter_code = excluded.starter_code,
  test_cases = excluded.test_cases,
  constraints = excluded.constraints,
  function_signature = excluded.function_signature;

-- Valid Parentheses (#20)
insert into public.problems (number, title, difficulty, topics, starter_code, test_cases, constraints, function_signature)
values (
  20,
  'Valid Parentheses',
  'Easy',
  '{"string","stack"}',
  '{"python": "class Solution:\n    def isValid(self, s: str) -> bool:\n        # your code here\n        pass", "javascript": "class Solution {\n  isValid(s) {\n    // your code here\n  }\n}"}',
  '[
    {"input": "{\"s\":\"()\"}", "expected_output": "true", "sample": true},
    {"input": "{\"s\":\"()[]{}\"}", "expected_output": "true", "sample": true},
    {"input": "{\"s\":\"(]\"}", "expected_output": "false", "sample": true},
    {"input": "{\"s\":\"([)]\"}", "expected_output": "false", "sample": false},
    {"input": "{\"s\":\"{[]}\"}", "expected_output": "true", "sample": false},
    {"input": "{\"s\":\"\"}", "expected_output": "true", "sample": false},
    {"input": "{\"s\":\"((\"}", "expected_output": "false", "sample": false},
    {"input": "{\"s\":\"([])\"}", "expected_output": "true", "sample": false}
  ]'::jsonb,
  '{"1 <= s.length <= 10^4", "s consists of parentheses only ''()[]{}''."}',
  '{"name": "isValid", "params": [{"name": "s", "type": "string"}]}'
)
on conflict (number) do update set
  starter_code = excluded.starter_code,
  test_cases = excluded.test_cases,
  constraints = excluded.constraints,
  function_signature = excluded.function_signature;

-- Merge Two Sorted Lists (#21)
insert into public.problems (number, title, difficulty, topics, starter_code, test_cases, constraints, function_signature)
values (
  21,
  'Merge Two Sorted Lists',
  'Easy',
  '{"linked-list","recursion"}',
  '{"python": "class Solution:\n    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\n        # your code here\n        pass", "javascript": "class Solution {\n  mergeTwoLists(list1, list2) {\n    // your code here\n  }\n}"}',
  '[
    {"input": "{\"list1\":[1,2,4],\"list2\":[1,3,4]}", "expected_output": "[1,1,2,3,4,4]", "sample": true},
    {"input": "{\"list1\":[],\"list2\":[]}", "expected_output": "[]", "sample": true},
    {"input": "{\"list1\":[],\"list2\":[0]}", "expected_output": "[0]", "sample": true},
    {"input": "{\"list1\":[1],\"list2\":[2]}", "expected_output": "[1,2]", "sample": false},
    {"input": "{\"list1\":[1,3,5],\"list2\":[2,4,6]}", "expected_output": "[1,2,3,4,5,6]", "sample": false},
    {"input": "{\"list1\":[1,2,3],\"list2\":[4,5,6]}", "expected_output": "[1,2,3,4,5,6]", "sample": false},
    {"input": "{\"list1\":[5],\"list2\":[1,2,3]}", "expected_output": "[1,2,3,5]", "sample": false},
    {"input": "{\"list1\":[1,1,1],\"list2\":[1,1,1]}", "expected_output": "[1,1,1,1,1,1]", "sample": false}
  ]'::jsonb,
  '{"The number of nodes in both lists is in the range [0, 50].", "-100 <= Node.val <= 100", "Both list1 and list2 are sorted in non-decreasing order."}',
  '{"name": "mergeTwoLists", "params": [{"name": "list1", "type": "ListNode"}, {"name": "list2", "type": "ListNode"}]}'
)
on conflict (number) do update set
  starter_code = excluded.starter_code,
  test_cases = excluded.test_cases,
  constraints = excluded.constraints,
  function_signature = excluded.function_signature;

-- Best Time to Buy and Sell Stock (#121)
insert into public.problems (number, title, difficulty, topics, starter_code, test_cases, constraints, function_signature)
values (
  121,
  'Best Time to Buy and Sell Stock',
  'Easy',
  '{"array","greedy"}',
  '{"python": "class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        # your code here\n        pass", "javascript": "class Solution {\n  maxProfit(prices) {\n    // your code here\n  }\n}"}',
  '[
    {"input": "{\"prices\":[7,1,5,3,6,4]}", "expected_output": "5", "sample": true},
    {"input": "{\"prices\":[7,6,4,3,1]}", "expected_output": "0", "sample": true},
    {"input": "{\"prices\":[1,2]}", "expected_output": "1", "sample": true},
    {"input": "{\"prices\":[2,4,1]}", "expected_output": "2", "sample": false},
    {"input": "{\"prices\":[3,2,6,5,0,3]}", "expected_output": "4", "sample": false},
    {"input": "{\"prices\":[1]}", "expected_output": "0", "sample": false},
    {"input": "{\"prices\":[2,1,2,1,0,1,2]}", "expected_output": "2", "sample": false},
    {"input": "{\"prices\":[1,2,3,4,5]}", "expected_output": "4", "sample": false}
  ]'::jsonb,
  '{"1 <= prices.length <= 10^5", "0 <= prices[i] <= 10^4"}',
  '{"name": "maxProfit", "params": [{"name": "prices", "type": "int[]"}]}'
)
on conflict (number) do update set
  starter_code = excluded.starter_code,
  test_cases = excluded.test_cases,
  constraints = excluded.constraints,
  function_signature = excluded.function_signature;

-- Contains Duplicate (#217)
insert into public.problems (number, title, difficulty, topics, starter_code, test_cases, constraints, function_signature)
values (
  217,
  'Contains Duplicate',
  'Easy',
  '{"array","hash-set","sorting"}',
  '{"python": "class Solution:\n    def containsDuplicate(self, nums: list[int]) -> bool:\n        # your code here\n        pass", "javascript": "class Solution {\n  containsDuplicate(nums) {\n    // your code here\n  }\n}"}',
  '[
    {"input": "{\"nums\":[1,2,3,1]}", "expected_output": "true", "sample": true},
    {"input": "{\"nums\":[1,2,3,4]}", "expected_output": "false", "sample": true},
    {"input": "{\"nums\":[1,1,1,3,3,4,3,2,4,2]}", "expected_output": "true", "sample": true},
    {"input": "{\"nums\":[1]}", "expected_output": "false", "sample": false},
    {"input": "{\"nums\":[1,2,3,4,5,6,7,8,9,10]}", "expected_output": "false", "sample": false},
    {"input": "{\"nums\":[1,2,3,1,2,3]}", "expected_output": "true", "sample": false},
    {"input": "{\"nums\":[0,0]}", "expected_output": "true", "sample": false},
    {"input": "{\"nums\":[-1,0,1,-1]}", "expected_output": "true", "sample": false}
  ]'::jsonb,
  '{"1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"}',
  '{"name": "containsDuplicate", "params": [{"name": "nums", "type": "int[]"}]}'
)
on conflict (number) do update set
  starter_code = excluded.starter_code,
  test_cases = excluded.test_cases,
  constraints = excluded.constraints,
  function_signature = excluded.function_signature;

-- Maximum Subarray (#53)
insert into public.problems (number, title, difficulty, topics, starter_code, test_cases, constraints, function_signature)
values (
  53,
  'Maximum Subarray',
  'Medium',
  '{"array","dynamic-programming","kadane"}',
  '{"python": "class Solution:\n    def maxSubArray(self, nums: list[int]) -> int:\n        # your code here\n        pass", "javascript": "class Solution {\n  maxSubArray(nums) {\n    // your code here\n  }\n}"}',
  '[
    {"input": "{\"nums\":[-2,1,-3,4,-1,2,1,-5,4]}", "expected_output": "6", "sample": true},
    {"input": "{\"nums\":[1]}", "expected_output": "1", "sample": true},
    {"input": "{\"nums\":[5,4,-1,7,8]}", "expected_output": "23", "sample": true},
    {"input": "{\"nums\":[-1]}", "expected_output": "-1", "sample": false},
    {"input": "{\"nums\":[-2,-1]}", "expected_output": "-1", "sample": false},
    {"input": "{\"nums\":[1,2,3,4,5]}", "expected_output": "15", "sample": false},
    {"input": "{\"nums\":[-1,-2,-3,-4]}", "expected_output": "-1", "sample": false},
    {"input": "{\"nums\":[8,-19,5,-4,20]}", "expected_output": "21", "sample": false}
  ]'::jsonb,
  '{"1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"}',
  '{"name": "maxSubArray", "params": [{"name": "nums", "type": "int[]"}]}'
)
on conflict (number) do update set
  starter_code = excluded.starter_code,
  test_cases = excluded.test_cases,
  constraints = excluded.constraints,
  function_signature = excluded.function_signature;

-- Binary Search (#704)
insert into public.problems (number, title, difficulty, topics, starter_code, test_cases, constraints, function_signature)
values (
  704,
  'Binary Search',
  'Easy',
  '{"array","binary-search"}',
  '{"python": "class Solution:\n    def search(self, nums: list[int], target: int) -> int:\n        # your code here\n        pass", "javascript": "class Solution {\n  search(nums, target) {\n    // your code here\n  }\n}"}',
  '[
    {"input": "{\"nums\":[-1,0,3,5,9,12],\"target\":9}", "expected_output": "4", "sample": true},
    {"input": "{\"nums\":[-1,0,3,5,9,12],\"target\":2}", "expected_output": "-1", "sample": true},
    {"input": "{\"nums\":[5],\"target\":5}", "expected_output": "0", "sample": true},
    {"input": "{\"nums\":[2,5],\"target\":5}", "expected_output": "1", "sample": false},
    {"input": "{\"nums\":[1,2,3,4,5],\"target\":3}", "expected_output": "2", "sample": false},
    {"input": "{\"nums\":[1,2,3,4,5],\"target\":6}", "expected_output": "-1", "sample": false},
    {"input": "{\"nums\":[1],\"target\":1}", "expected_output": "0", "sample": false},
    {"input": "{\"nums\":[1,3,5,7,9],\"target\":7}", "expected_output": "3", "sample": false}
  ]'::jsonb,
  '{"1 <= nums.length <= 10^4", "-10^4 < nums[i], target < 10^4", "nums is sorted in ascending order.", "All integers in nums are unique."}',
  '{"name": "search", "params": [{"name": "nums", "type": "int[]"}, {"name": "target", "type": "int"}]}'
)
on conflict (number) do update set
  starter_code = excluded.starter_code,
  test_cases = excluded.test_cases,
  constraints = excluded.constraints,
  function_signature = excluded.function_signature;

-- Climbing Stairs (#70)
insert into public.problems (number, title, difficulty, topics, starter_code, test_cases, constraints, function_signature)
values (
  70,
  'Climbing Stairs',
  'Easy',
  '{"dynamic-programming","fibonacci","math"}',
  '{"python": "class Solution:\n    def climbStairs(self, n: int) -> int:\n        # your code here\n        pass", "javascript": "class Solution {\n  climbStairs(n) {\n    // your code here\n  }\n}"}',
  '[
    {"input": "{\"n\":2}", "expected_output": "2", "sample": true},
    {"input": "{\"n\":3}", "expected_output": "3", "sample": true},
    {"input": "{\"n\":1}", "expected_output": "1", "sample": true},
    {"input": "{\"n\":4}", "expected_output": "5", "sample": false},
    {"input": "{\"n\":5}", "expected_output": "8", "sample": false},
    {"input": "{\"n\":10}", "expected_output": "89", "sample": false},
    {"input": "{\"n\":6}", "expected_output": "13", "sample": false},
    {"input": "{\"n\":7}", "expected_output": "21", "sample": false}
  ]'::jsonb,
  '{"1 <= n <= 45"}',
  '{"name": "climbStairs", "params": [{"name": "n", "type": "int"}]}'
)
on conflict (number) do update set
  starter_code = excluded.starter_code,
  test_cases = excluded.test_cases,
  constraints = excluded.constraints,
  function_signature = excluded.function_signature;

-- Invert Binary Tree (#226)
insert into public.problems (number, title, difficulty, topics, starter_code, test_cases, constraints, function_signature)
values (
  226,
  'Invert Binary Tree',
  'Easy',
  '{"tree","recursion","dfs"}',
  '{"python": "class Solution:\n    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:\n        # your code here\n        pass", "javascript": "class Solution {\n  invertTree(root) {\n    // your code here\n  }\n}"}',
  '[
    {"input": "{\"root\":[4,2,7,1,3,6,9]}", "expected_output": "[4,7,2,9,6,3,1]", "sample": true},
    {"input": "{\"root\":[2,1,3]}", "expected_output": "[2,3,1]", "sample": true},
    {"input": "{\"root\":[]}", "expected_output": "[]", "sample": true},
    {"input": "{\"root\":[1]}", "expected_output": "[1]", "sample": false},
    {"input": "{\"root\":[1,2]}", "expected_output": "[1,2]", "sample": false},
    {"input": "{\"root\":[1,2,3]}", "expected_output": "[1,3,2]", "sample": false},
    {"input": "{\"root\":[1,2,3,4,5,6,7]}", "expected_output": "[1,3,2,7,6,5,4]", "sample": false},
    {"input": "{\"root\":[5,3,7,1,4,6,8]}", "expected_output": "[5,7,3,8,6,4,1]", "sample": false}
  ]'::jsonb,
  '{"The number of nodes in the tree is in the range [0, 100].", "-100 <= Node.val <= 100"}',
  '{"name": "invertTree", "params": [{"name": "root", "type": "TreeNode"}]}'
)
on conflict (number) do update set
  starter_code = excluded.starter_code,
  test_cases = excluded.test_cases,
  constraints = excluded.constraints,
  function_signature = excluded.function_signature;

-- Valid Anagram (#242)
insert into public.problems (number, title, difficulty, topics, starter_code, test_cases, constraints, function_signature)
values (
  242,
  'Valid Anagram',
  'Easy',
  '{"string","hash-map","sorting"}',
  '{"python": "class Solution:\n    def isAnagram(self, s: str, t: str) -> bool:\n        # your code here\n        pass", "javascript": "class Solution {\n  isAnagram(s, t) {\n    // your code here\n  }\n}"}',
  '[
    {"input": "{\"s\":\"anagram\",\"t\":\"nagaram\"}", "expected_output": "true", "sample": true},
    {"input": "{\"s\":\"rat\",\"t\":\"car\"}", "expected_output": "false", "sample": true},
    {"input": "{\"s\":\"a\",\"t\":\"a\"}", "expected_output": "true", "sample": true},
    {"input": "{\"s\":\"ab\",\"t\":\"a\"}", "expected_output": "false", "sample": false},
    {"input": "{\"s\":\"listen\",\"t\":\"silent\"}", "expected_output": "true", "sample": false},
    {"input": "{\"s\":\"\",\"t\":\"\"}", "expected_output": "true", "sample": false},
    {"input": "{\"s\":\"aacc\",\"t\":\"ccac\"}", "expected_output": "false", "sample": false},
    {"input": "{\"s\":\"abc\",\"t\":\"cba\"}", "expected_output": "true", "sample": false}
  ]'::jsonb,
  '{"1 <= s.length, t.length <= 5 * 10^4", "s and t consist of lowercase English letters."}',
  '{"name": "isAnagram", "params": [{"name": "s", "type": "string"}, {"name": "t", "type": "string"}]}'
)
on conflict (number) do update set
  starter_code = excluded.starter_code,
  test_cases = excluded.test_cases,
  constraints = excluded.constraints,
  function_signature = excluded.function_signature;
