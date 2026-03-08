-- ============================================================
-- Seed: MadLeets sample challenges
-- clip_id and problem_id are left NULL for standalone dev/testing
-- ============================================================

insert into public.challenges
  (id, language, code_block, blank_line_index, blank_line_content, accepted_answers, hint, explanation, difficulty, pause_timestamp, xp_value, tags)
values

-- 1 · Two Sum (Easy — Hash Map)
(
  'a0000000-0000-0000-0000-000000000001',
  'python',
  E'def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        _______________\n            return [seen[complement], i]\n        seen[num] = i',
  4,
  '        if complement in seen:',
  '{
    "if complement in seen:",
    "if complement in seen :",
    "if seen.get(complement) is not None:",
    "if complement in seen.keys():"
  }',
  'Check whether the complement already exists in the hash map.',
  'We store each number''s index as we iterate. Before storing, we check if (target - current) was already seen — giving us O(n) time.',
  'easy',
  12.5,
  10,
  '{"array","hash-map","two-sum"}'
),

-- 2 · Valid Parentheses (Easy — Stack)
(
  'a0000000-0000-0000-0000-000000000002',
  'python',
  E'def isValid(s):\n    stack = []\n    mapping = {\")\": \"(\", \"}\": \"{\", \"]\": \"[\"}\n    for char in s:\n        if char in mapping:\n            top = stack.pop() if stack else \"#\"\n            _______________\n                return False\n        else:\n            stack.append(char)\n    return not stack',
  6,
  '            if mapping[char] != top:',
  '{
    "if mapping[char] != top:",
    "if top != mapping[char]:",
    "if mapping.get(char) != top:"
  }',
  'Compare the popped element with the expected opening bracket.',
  'Each closing bracket must match the most recent opening bracket. The stack keeps track of openers in LIFO order.',
  'easy',
  15.0,
  10,
  '{"string","stack","valid-parentheses"}'
),

-- 3 · Merge Two Sorted Lists (Easy — Linked List)
(
  'a0000000-0000-0000-0000-000000000003',
  'python',
  E'def mergeTwoLists(l1, l2):\n    dummy = ListNode(0)\n    current = dummy\n    while l1 and l2:\n        _______________\n            current.next = l1\n            l1 = l1.next\n        else:\n            current.next = l2\n            l2 = l2.next\n        current = current.next\n    current.next = l1 or l2\n    return dummy.next',
  4,
  '        if l1.val <= l2.val:',
  '{
    "if l1.val <= l2.val:",
    "if l1.val < l2.val:",
    "if l1.val<=l2.val:",
    "if l1.val < l2.val or l1.val == l2.val:"
  }',
  'Compare the current values of both lists to decide which node comes next.',
  'The dummy node avoids special-casing the head. We compare values and always append the smaller one.',
  'easy',
  18.5,
  10,
  '{"linked-list","recursion","merge"}'
),

-- 4 · Binary Search (Easy — Array)
(
  'a0000000-0000-0000-0000-000000000004',
  'python',
  E'def search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        _______________\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1',
  3,
  '        mid = (left + right) // 2',
  '{
    "mid = (left + right) // 2",
    "mid = left + (right - left) // 2",
    "mid=(left+right)//2"
  }',
  'How do you find the middle index from left and right pointers?',
  'Computing mid as (left + right) // 2 splits the search space in half each iteration — O(log n).',
  'easy',
  8.0,
  10,
  '{"array","binary-search"}'
),

-- 5 · Best Time to Buy and Sell Stock (Easy — Greedy)
(
  'a0000000-0000-0000-0000-000000000005',
  'python',
  E'def maxProfit(prices):\n    min_price = float(\"inf\")\n    max_profit = 0\n    for price in prices:\n        _______________\n        max_profit = max(max_profit, price - min_price)\n    return max_profit',
  4,
  '        min_price = min(min_price, price)',
  '{
    "min_price = min(min_price, price)",
    "min_price=min(min_price,price)",
    "if price < min_price: min_price = price",
    "min_price = price if price < min_price else min_price"
  }',
  'Track the lowest price seen so far as you iterate.',
  'By always knowing the cheapest buying price so far, we can compute the best possible profit at each step in one pass.',
  'easy',
  10.0,
  10,
  '{"array","greedy","sliding-window"}'
),

-- 6 · Longest Substring Without Repeating (Medium — Sliding Window)
(
  'a0000000-0000-0000-0000-000000000006',
  'python',
  E'def lengthOfLongestSubstring(s):\n    char_set = set()\n    left = 0\n    result = 0\n    for right in range(len(s)):\n        while s[right] in char_set:\n            _______________\n            left += 1\n        char_set.add(s[right])\n        result = max(result, right - left + 1)\n    return result',
  6,
  '            char_set.remove(s[left])',
  '{
    "char_set.remove(s[left])",
    "char_set.discard(s[left])",
    "char_set -= {s[left]}"
  }',
  'Shrink the window by removing the leftmost character from the set.',
  'The sliding window expands right and contracts left. When a duplicate is found we remove characters from the left until the window is valid again.',
  'medium',
  22.0,
  20,
  '{"string","sliding-window","hash-set"}'
),

-- 7 · Container With Most Water (Medium — Two Pointers)
(
  'a0000000-0000-0000-0000-000000000007',
  'python',
  E'def maxArea(height):\n    left, right = 0, len(height) - 1\n    max_water = 0\n    while left < right:\n        width = right - left\n        h = min(height[left], height[right])\n        _______________\n        if height[left] < height[right]:\n            left += 1\n        else:\n            right -= 1\n    return max_water',
  6,
  '        max_water = max(max_water, width * h)',
  '{
    "max_water = max(max_water, width * h)",
    "max_water = max(max_water, h * width)",
    "max_water=max(max_water,width*h)"
  }',
  'Calculate the area and update the maximum.',
  'Area = width × min(heights). We move the shorter pointer inward because that is the only way to potentially find a taller line.',
  'medium',
  14.0,
  20,
  '{"array","two-pointers","greedy"}'
),

-- 8 · 3Sum (Medium — Sorting + Two Pointers)
(
  'a0000000-0000-0000-0000-000000000008',
  'python',
  E'def threeSum(nums):\n    nums.sort()\n    result = []\n    for i in range(len(nums) - 2):\n        if i > 0 and nums[i] == nums[i - 1]:\n            continue\n        left, right = i + 1, len(nums) - 1\n        while left < right:\n            total = nums[i] + nums[left] + nums[right]\n            if total == 0:\n                result.append([nums[i], nums[left], nums[right]])\n                _______________\n                while left < right and nums[right] == nums[right + 1]:\n                    right -= 1\n            elif total < 0:\n                left += 1\n            else:\n                right -= 1\n    return result',
  11,
  '                while left < right and nums[left] == nums[left - 1]:\n                    left += 1',
  '{
    "while left < right and nums[left] == nums[left - 1]: left += 1",
    "while left < right and nums[left] == nums[left-1]:\\n                    left += 1"
  }',
  'After finding a valid triplet, skip duplicate values for the left pointer.',
  'Sorting lets us use two pointers. After recording a triplet we must skip duplicates on both sides to avoid repeated results.',
  'medium',
  30.0,
  20,
  '{"array","two-pointers","sorting"}'
),

-- 9 · Climbing Stairs (Easy — Dynamic Programming)
(
  'a0000000-0000-0000-0000-000000000009',
  'python',
  E'def climbStairs(n):\n    if n <= 2:\n        return n\n    prev, curr = 1, 2\n    for i in range(3, n + 1):\n        _______________\n        prev = curr\n        curr = temp\n    return curr',
  5,
  '        temp = prev + curr',
  '{
    "temp = prev + curr",
    "temp=prev+curr",
    "prev, curr = curr, prev + curr"
  }',
  'Each step can be reached from one step below or two steps below.',
  'This is Fibonacci in disguise. f(n) = f(n-1) + f(n-2), and we only need the previous two values — O(n) time, O(1) space.',
  'easy',
  9.0,
  10,
  '{"dynamic-programming","fibonacci","math"}'
),

-- 10 · Maximum Subarray / Kadane (Medium — DP)
(
  'a0000000-0000-0000-0000-000000000010',
  'python',
  E'def maxSubArray(nums):\n    max_sum = nums[0]\n    current_sum = nums[0]\n    for num in nums[1:]:\n        _______________\n        max_sum = max(max_sum, current_sum)\n    return max_sum',
  4,
  '        current_sum = max(num, current_sum + num)',
  '{
    "current_sum = max(num, current_sum + num)",
    "current_sum=max(num,current_sum+num)",
    "current_sum = num if num > current_sum + num else current_sum + num"
  }',
  'At each element decide: start fresh or extend the existing subarray?',
  'Kadane''s algorithm: if the running sum becomes negative, it is better to start a new subarray from the current element.',
  'medium',
  11.5,
  20,
  '{"array","dynamic-programming","kadane"}'
),

-- 11 · Invert Binary Tree (Easy — Tree)
(
  'a0000000-0000-0000-0000-000000000011',
  'python',
  E'def invertTree(root):\n    if not root:\n        return None\n    _______________\n    invertTree(root.left)\n    invertTree(root.right)\n    return root',
  3,
  '    root.left, root.right = root.right, root.left',
  '{
    "root.left, root.right = root.right, root.left",
    "root.left,root.right=root.right,root.left",
    "root.left, root.right = root.right, root.left  # swap"
  }',
  'Swap the two children before recursing.',
  'Inverting a tree means swapping every left/right child pair. Do it at each node via pre-order traversal.',
  'easy',
  7.0,
  10,
  '{"tree","recursion","dfs"}'
),

-- 12 · Merge Intervals (Medium — Sorting)
(
  'a0000000-0000-0000-0000-000000000012',
  'python',
  E'def merge(intervals):\n    intervals.sort(key=lambda x: x[0])\n    merged = [intervals[0]]\n    for start, end in intervals[1:]:\n        _______________\n            merged[-1][1] = max(merged[-1][1], end)\n        else:\n            merged.append([start, end])\n    return merged',
  4,
  '        if start <= merged[-1][1]:',
  '{
    "if start <= merged[-1][1]:",
    "if merged[-1][1] >= start:",
    "if start<=merged[-1][1]:"
  }',
  'How do you detect overlapping intervals?',
  'After sorting by start time, two intervals overlap when the current start is ≤ the previous end. We extend the previous interval''s end if needed.',
  'medium',
  16.0,
  20,
  '{"array","sorting","intervals"}'
),

-- 13 · Trapping Rain Water (Hard — Two Pointers)
(
  'a0000000-0000-0000-0000-000000000013',
  'python',
  E'def trap(height):\n    left, right = 0, len(height) - 1\n    left_max = right_max = 0\n    water = 0\n    while left < right:\n        if height[left] < height[right]:\n            if height[left] >= left_max:\n                left_max = height[left]\n            else:\n                _______________\n            left += 1\n        else:\n            if height[right] >= right_max:\n                right_max = height[right]\n            else:\n                water += right_max - height[right]\n            right -= 1\n    return water',
  9,
  '                water += left_max - height[left]',
  '{
    "water += left_max - height[left]",
    "water+=left_max-height[left]",
    "water = water + left_max - height[left]"
  }',
  'Water above this bar equals the max height seen minus the current height.',
  'Two pointers approach: the water at any position is bounded by the shorter of the two maximum heights. We process from the shorter side inward.',
  'hard',
  35.0,
  30,
  '{"array","two-pointers","dynamic-programming"}'
),

-- 14 · Word Break (Medium — DP)
(
  'a0000000-0000-0000-0000-000000000014',
  'python',
  E'def wordBreak(s, wordDict):\n    word_set = set(wordDict)\n    dp = [False] * (len(s) + 1)\n    dp[0] = True\n    for i in range(1, len(s) + 1):\n        for j in range(i):\n            _______________\n                dp[i] = True\n                break\n    return dp[len(s)]',
  6,
  '            if dp[j] and s[j:i] in word_set:',
  '{
    "if dp[j] and s[j:i] in word_set:",
    "if dp[j] and s[j:i] in set(wordDict):",
    "if dp[j] == True and s[j:i] in word_set:"
  }',
  'Check whether a valid split at j and the substring from j to i form a word.',
  'dp[i] is True if the first i characters can be segmented. We try every split point j where dp[j] is True and check if s[j:i] is a dictionary word.',
  'medium',
  25.0,
  20,
  '{"string","dynamic-programming","hash-set"}'
),

-- 15 · Coin Change (Medium — DP)
(
  'a0000000-0000-0000-0000-000000000015',
  'python',
  E'def coinChange(coins, amount):\n    dp = [float(\"inf\")] * (amount + 1)\n    dp[0] = 0\n    for coin in coins:\n        for x in range(coin, amount + 1):\n            _______________\n    return dp[amount] if dp[amount] != float(\"inf\") else -1',
  5,
  '            dp[x] = min(dp[x], dp[x - coin] + 1)',
  '{
    "dp[x] = min(dp[x], dp[x - coin] + 1)",
    "dp[x]=min(dp[x],dp[x-coin]+1)",
    "dp[x] = min(dp[x], 1 + dp[x - coin])"
  }',
  'Use the current coin to potentially reduce the number of coins needed.',
  'Classic unbounded knapsack: for each coin, update every reachable amount. dp[x] stores the fewest coins to make amount x.',
  'medium',
  20.0,
  20,
  '{"dynamic-programming","bfs","coin-change"}'
);
