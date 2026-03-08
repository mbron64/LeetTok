/**
 * Language-specific wrappers for code execution.
 * Each wrapper reads JSON from stdin, calls the user's solution, and prints result as JSON to stdout.
 * functionName: method/function to call (e.g. "twoSum", "isValid")
 * Input JSON keys should match the parameter names (e.g. {"nums":[2,7,11,15],"target":9} for twoSum).
 * Input is passed via Judge0 stdin - no embedding in source.
 */

export function getWrapper(
  languageId: number,
  userCode: string,
  _input: string,
  functionName: string = "solve"
): string {
  const fn = functionName;

  switch (languageId) {
    case 71: // Python 3
      return getPythonWrapper(userCode, fn);
    case 63: // JavaScript (Node.js)
      return getJavaScriptWrapper(userCode, fn);
    case 62: // Java
      return getJavaWrapper(userCode, fn);
    case 54: // C++ (GCC 9.2.0)
      return getCppWrapper(userCode, fn);
    default:
      throw new Error(`Unsupported language_id: ${languageId}`);
  }
}

function getPythonWrapper(userCode: string, fn: string): string {
  return `
import json
import sys

${userCode}

if __name__ == "__main__":
    try:
        data = json.loads(sys.stdin.read())
        sol = Solution()
        method = getattr(sol, "${fn}")
        result = method(**{k: v for k, v in data.items()})
        print(json.dumps({"result": result}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
`;
}

function getJavaScriptWrapper(userCode: string, fn: string): string {
  return `
${userCode}

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const sol = new Solution();
    const keys = Object.keys(data);
    const args = keys.map(k => data[k]);
    const result = sol.${fn}(...args);
    console.log(JSON.stringify({ result }));
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }));
  }
});
`;
}

function getJavaWrapper(userCode: string, fn: string): string {
  // Java: read from stdin; use minimal regex parsing (no JSON lib in Judge0).
  // Supports twoSum-style (nums, target) and similar int[]/int signatures.
  return `
import java.util.*;
import java.util.regex.*;

${userCode}

public class Main {
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    StringBuilder sb = new StringBuilder();
    while (sc.hasNextLine()) sb.append(sc.nextLine());
    String raw = sb.toString();
    try {
      Object result = invoke(new Solution(), "${fn}", raw);
      System.out.println("{\\"result\\":" + toJson(result) + "}");
    } catch (Exception e) {
      System.out.println("{\\"error\\":\\"" + escape(e.getMessage()) + "\\"}");
    }
  }
  static String escape(String s) {
    if (s == null) return "";
    return s.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"");
  }
  static Object invoke(Solution sol, String method, String raw) throws Exception {
    java.lang.reflect.Method m = sol.getClass().getMethod(method, int[].class, int.class);
    int[] nums = parseJsonIntArray(raw, "nums");
    int target = parseJsonInt(raw, "target");
    return m.invoke(sol, nums, target);
  }
  static int[] parseJsonIntArray(String s, String key) {
    Pattern p = Pattern.compile("\\"" + key + "\\"\\\\s*:\\\\s*\\\\[([^\\\\]]*)\\\\]");
    Matcher m = p.matcher(s);
    if (!m.find()) return new int[0];
    String inner = m.group(1).trim();
    if (inner.isEmpty()) return new int[0];
    String[] parts = inner.split(",");
    int[] arr = new int[parts.length];
    for (int i = 0; i < parts.length; i++) arr[i] = Integer.parseInt(parts[i].trim());
    return arr;
  }
  static int parseJsonInt(String s, String key) {
    Pattern p = Pattern.compile("\\"" + key + "\\"\\\\s*:\\\\s*(-?\\\\d+)");
    Matcher m = p.matcher(s);
    return m.find() ? Integer.parseInt(m.group(1)) : 0;
  }
  static String toJson(Object o) {
    if (o instanceof int[]) {
      int[] a = (int[]) o;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
      return sb.append("]").toString();
    }
    return "null";
  }
}
`;
}

function getCppWrapper(userCode: string, fn: string): string {
  // C++: read from stdin; minimal parsing for twoSum-style (nums, target).
  return `
#include <iostream>
#include <vector>
#include <sstream>
#include <string>

${userCode}

int main() {
  std::string line, raw;
  while (std::getline(std::cin, line)) raw += line;
  try {
    std::vector<int> nums;
    int target = 0;
    size_t p = raw.find("\\"nums\\":");
    if (p != std::string::npos) {
      p = raw.find("[", p) + 1;
      size_t q = raw.find("]", p);
      std::string arr = raw.substr(p, q - p);
      std::istringstream ss(arr);
      std::string part;
      while (std::getline(ss, part, ',')) nums.push_back(std::stoi(part));
    }
    p = raw.find("\\"target\\":");
    if (p != std::string::npos) target = std::stoi(raw.substr(p + 9));
    Solution sol;
    std::vector<int> result = sol.${fn}(nums, target);
    std::cout << "{\\"result\\":[" << result[0] << "," << result[1] << "]}" << std::endl;
  } catch (std::exception& e) {
    std::cout << "{\\"error\\":\\"" << e.what() << "\\"}" << std::endl;
  }
  return 0;
}
`;
}
