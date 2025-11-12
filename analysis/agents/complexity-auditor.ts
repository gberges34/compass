#!/usr/bin/env ts-node

/**
 * Agent 3: Cyclomatic Complexity Auditor
 *
 * Calculates McCabe's Cyclomatic Complexity for each function
 * using the formula: M = E - N + 2P
 * Where E = edges, N = nodes, P = connected components
 *
 * Simplified approach: Count decision points + 1
 */

import * as fs from 'fs';
import * as path from 'path';

interface ComplexityResult {
  file: string;
  line: number;
  functionName: string;
  complexity: number;
  category: 'simple' | 'moderate' | 'complex' | 'very-complex';
  nestingDepth: number;
}

interface ComplexityAnalysis {
  averageComplexity: number;
  distribution: {
    simple: number; // 1-5
    moderate: number; // 6-10
    complex: number; // 11-20
    veryComplex: number; // 21+
  };
  topComplexFunctions: ComplexityResult[];
  nestingViolations: ComplexityResult[];
  simplificationStrategies: Array<{
    file: string;
    line: number;
    functionName: string;
    complexity: number;
    suggestion: string;
  }>;
  comparisonBenchmark: string;
}

class ComplexityAuditor {
  private rootDir: string;
  private results: ComplexityResult[] = [];

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async analyze(): Promise<ComplexityAnalysis> {
    console.log('🔍 Starting Cyclomatic Complexity Analysis...');

    const sourceFiles = this.findSourceFiles();
    console.log(`📁 Found ${sourceFiles.length} source files`);

    for (const file of sourceFiles) {
      await this.analyzeFile(file);
    }

    return this.generateReport();
  }

  private findSourceFiles(): string[] {
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    const excludeDirs = ['node_modules', 'dist', 'build', '.git', 'coverage'];

    const findFiles = (dir: string): string[] => {
      let results: string[] = [];

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            if (!excludeDirs.includes(entry.name)) {
              results = results.concat(findFiles(fullPath));
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
              results.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }

      return results;
    };

    return findFiles(this.rootDir);
  }

  private async analyzeFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const functions = this.extractFunctions(filePath, content);

      for (const func of functions) {
        const complexity = this.calculateComplexity(func.body);
        const nestingDepth = this.calculateNestingDepth(func.body);
        const category = this.categorizeComplexity(complexity);

        this.results.push({
          file: path.relative(this.rootDir, filePath),
          line: func.line,
          functionName: func.name,
          complexity,
          category,
          nestingDepth
        });
      }
    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error);
    }
  }

  private extractFunctions(filePath: string, content: string): Array<{
    name: string;
    line: number;
    body: string;
  }> {
    const functions: Array<{ name: string; line: number; body: string }> = [];

    // Match various function patterns
    const patterns = [
      // Function declarations
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*{/g,
      // Arrow functions
      /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*{/g,
      // Method definitions
      /(\w+)\s*\([^)]*\)\s*{/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1];
        const startPos = match.index;
        const lineNum = content.substring(0, startPos).split('\n').length;

        // Extract function body
        const body = this.extractFunctionBody(content, startPos);

        if (body) {
          functions.push({
            name: functionName,
            line: lineNum,
            body
          });
        }
      }
    }

    return functions;
  }

  private extractFunctionBody(content: string, startPos: number): string | null {
    let braceCount = 0;
    let startBodyPos = -1;
    let endBodyPos = -1;

    for (let i = startPos; i < content.length; i++) {
      const char = content[i];

      if (char === '{') {
        if (braceCount === 0) {
          startBodyPos = i;
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          endBodyPos = i;
          break;
        }
      }
    }

    if (startBodyPos !== -1 && endBodyPos !== -1) {
      return content.substring(startBodyPos, endBodyPos + 1);
    }

    return null;
  }

  private calculateComplexity(functionBody: string): number {
    // Cyclomatic Complexity = 1 + number of decision points
    let complexity = 1;

    // Decision points
    const decisionPatterns = [
      /\bif\s*\(/g,                    // if statements
      /\belse\s+if\b/g,                // else if
      /\bfor\s*\(/g,                   // for loops
      /\bwhile\s*\(/g,                 // while loops
      /\bcase\s+/g,                    // switch cases
      /\bcatch\s*\(/g,                 // catch blocks
      /\?\s*[^:]+\s*:/g,               // ternary operators
      /&&/g,                           // logical AND
      /\|\|/g,                         // logical OR
      /\?\?/g,                         // nullish coalescing
    ];

    for (const pattern of decisionPatterns) {
      const matches = functionBody.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private calculateNestingDepth(functionBody: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    // Track nesting of control structures
    const lines = functionBody.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Increase depth on control structures
      if (
        trimmed.startsWith('if ') ||
        trimmed.startsWith('for ') ||
        trimmed.startsWith('while ') ||
        trimmed.startsWith('switch ') ||
        trimmed.includes(') {')
      ) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }

      // Decrease depth on closing braces
      if (trimmed === '}' || trimmed.startsWith('}')) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return maxDepth;
  }

  private categorizeComplexity(complexity: number): 'simple' | 'moderate' | 'complex' | 'very-complex' {
    if (complexity <= 5) return 'simple';
    if (complexity <= 10) return 'moderate';
    if (complexity <= 20) return 'complex';
    return 'very-complex';
  }

  private generateReport(): ComplexityAnalysis {
    // Calculate average
    const totalComplexity = this.results.reduce((sum, r) => sum + r.complexity, 0);
    const averageComplexity = this.results.length > 0
      ? Math.round((totalComplexity / this.results.length) * 10) / 10
      : 0;

    // Distribution
    const distribution = {
      simple: this.results.filter(r => r.category === 'simple').length,
      moderate: this.results.filter(r => r.category === 'moderate').length,
      complex: this.results.filter(r => r.category === 'complex').length,
      veryComplex: this.results.filter(r => r.category === 'very-complex').length,
    };

    // Top 10 most complex
    const topComplexFunctions = [...this.results]
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 10);

    // Nesting violations (> 3 levels)
    const nestingViolations = this.results.filter(r => r.nestingDepth > 3);

    // Simplification strategies
    const simplificationStrategies = this.generateSimplificationStrategies();

    // Benchmark comparison
    const comparisonBenchmark = this.generateBenchmark(averageComplexity, distribution);

    return {
      averageComplexity,
      distribution,
      topComplexFunctions,
      nestingViolations,
      simplificationStrategies,
      comparisonBenchmark
    };
  }

  private generateSimplificationStrategies(): Array<{
    file: string;
    line: number;
    functionName: string;
    complexity: number;
    suggestion: string;
  }> {
    const strategies: Array<any> = [];

    // Focus on functions with complexity > 15
    const complexFunctions = this.results.filter(r => r.complexity > 15);

    for (const func of complexFunctions.slice(0, 5)) {
      let suggestion = '';

      if (func.complexity > 30) {
        suggestion = 'Extract multiple helper functions to break down logic';
      } else if (func.complexity > 20) {
        suggestion = 'Extract complex conditionals into named boolean functions';
      } else if (func.nestingDepth > 4) {
        suggestion = 'Reduce nesting by using early returns and guard clauses';
      } else {
        suggestion = 'Consider using the Strategy pattern or lookup tables to reduce conditionals';
      }

      strategies.push({
        file: func.file,
        line: func.line,
        functionName: func.functionName,
        complexity: func.complexity,
        suggestion
      });
    }

    return strategies;
  }

  private generateBenchmark(average: number, distribution: any): string {
    const total = distribution.simple + distribution.moderate + distribution.complex + distribution.veryComplex;
    const complexPercent = total > 0 ? Math.round(((distribution.complex + distribution.veryComplex) / total) * 100) : 0;

    let benchmark = `Average complexity: ${average} `;

    if (average < 6) {
      benchmark += '(✅ Excellent - below industry target of 10)';
    } else if (average < 10) {
      benchmark += '(✅ Good - at industry target of <10)';
    } else if (average < 15) {
      benchmark += '(⚠️  Fair - above target, refactoring recommended)';
    } else {
      benchmark += '(❌ Poor - significant refactoring needed)';
    }

    benchmark += `\n\n${complexPercent}% of functions are complex (>10 complexity)`;

    if (complexPercent < 10) {
      benchmark += ' (✅ Excellent)';
    } else if (complexPercent < 20) {
      benchmark += ' (✅ Good)';
    } else if (complexPercent < 30) {
      benchmark += ' (⚠️  Fair)';
    } else {
      benchmark += ' (❌ Needs improvement)';
    }

    return benchmark;
  }

  async saveReport(analysis: ComplexityAnalysis): Promise<void> {
    const reportPath = path.join(this.rootDir, 'analysis', 'ANALYSIS_REPORT.md');
    let reportContent = fs.readFileSync(reportPath, 'utf-8');

    const section = this.formatReportSection(analysis);

    reportContent = reportContent.replace(
      /## Cyclomatic Complexity Analysis\n\n[\s\S]*?(?=\n---\n\n## |$)/,
      `## Cyclomatic Complexity Analysis\n\n${section}\n`
    );

    fs.writeFileSync(reportPath, reportContent, 'utf-8');
    console.log('✅ Complexity analysis saved to ANALYSIS_REPORT.md');

    const dataPath = path.join(this.rootDir, 'analysis', 'data', 'complexity-raw.json');
    fs.writeFileSync(dataPath, JSON.stringify({
      analysis,
      results: this.results,
      timestamp: new Date().toISOString()
    }, null, 2));
    console.log('✅ Raw data saved to data/complexity-raw.json');
  }

  private formatReportSection(analysis: ComplexityAnalysis): string {
    let output = `**Repository-Wide Average Complexity:** ${analysis.averageComplexity}\n\n`;

    output += `### Complexity Distribution\n\n`;
    const total = Object.values(analysis.distribution).reduce((a, b) => a + b, 0);
    output += `- **Simple (1-5):** ${analysis.distribution.simple} (${Math.round((analysis.distribution.simple / total) * 100)}%)\n`;
    output += `- **Moderate (6-10):** ${analysis.distribution.moderate} (${Math.round((analysis.distribution.moderate / total) * 100)}%)\n`;
    output += `- **Complex (11-20):** ${analysis.distribution.complex} (${Math.round((analysis.distribution.complex / total) * 100)}%)\n`;
    output += `- **Very Complex (21+):** ${analysis.distribution.veryComplex} (${Math.round((analysis.distribution.veryComplex / total) * 100)}%)\n\n`;

    // Text-based histogram
    output += `### Visual Distribution\n\n\`\`\`\n`;
    const maxCount = Math.max(...Object.values(analysis.distribution));
    const scale = 50 / maxCount;

    output += `Simple    (1-5)  [${'█'.repeat(Math.round(analysis.distribution.simple * scale))}] ${analysis.distribution.simple}\n`;
    output += `Moderate (6-10)  [${'█'.repeat(Math.round(analysis.distribution.moderate * scale))}] ${analysis.distribution.moderate}\n`;
    output += `Complex  (11-20) [${'█'.repeat(Math.round(analysis.distribution.complex * scale))}] ${analysis.distribution.complex}\n`;
    output += `V.Complex (21+)  [${'█'.repeat(Math.round(analysis.distribution.veryComplex * scale))}] ${analysis.distribution.veryComplex}\n`;
    output += `\`\`\`\n\n`;

    output += `### Top 10 Most Complex Functions\n\n`;
    output += `| Rank | Function | File:Line | Complexity | Category |\n`;
    output += `|------|----------|-----------|------------|----------|\n`;
    for (let i = 0; i < analysis.topComplexFunctions.length; i++) {
      const func = analysis.topComplexFunctions[i];
      output += `| ${i + 1} | \`${func.functionName}\` | ${func.file}:${func.line} | ${func.complexity} | ${func.category} |\n`;
    }
    output += `\n`;

    output += `### Nesting Depth Violations (>3 levels)\n\n`;
    if (analysis.nestingViolations.length === 0) {
      output += `✅ No deep nesting violations found!\n\n`;
    } else {
      output += `Found ${analysis.nestingViolations.length} functions with excessive nesting:\n\n`;
      for (const violation of analysis.nestingViolations.slice(0, 10)) {
        output += `- \`${violation.functionName}\` (${violation.file}:${violation.line}) - ${violation.nestingDepth} levels deep\n`;
      }
      output += `\n`;
    }

    output += `### Simplification Strategies\n\n`;
    for (const strategy of analysis.simplificationStrategies) {
      output += `**${strategy.functionName}** (complexity: ${strategy.complexity})\n`;
      output += `- Location: ${strategy.file}:${strategy.line}\n`;
      output += `- Strategy: ${strategy.suggestion}\n\n`;
    }

    output += `### Comparison to Industry Standards\n\n`;
    output += `${analysis.comparisonBenchmark}\n\n`;
    output += `**Industry Targets:**\n`;
    output += `- Average complexity: <10 (optimal: <5)\n`;
    output += `- Max function complexity: <20\n`;
    output += `- Functions >10 complexity: <20% of codebase\n\n`;

    output += `### Example: Reducing Complexity\n\n`;
    output += `\`\`\`typescript\n`;
    output += `// ❌ Before: Complexity = 12\n`;
    output += `function validateUser(user: User) {\n`;
    output += `  if (user) {\n`;
    output += `    if (user.email) {\n`;
    output += `      if (user.email.includes('@')) {\n`;
    output += `        if (user.age && user.age >= 18) {\n`;
    output += `          if (user.country === 'US' || user.country === 'CA') {\n`;
    output += `            return true;\n`;
    output += `          }\n`;
    output += `        }\n`;
    output += `      }\n`;
    output += `    }\n`;
    output += `  }\n`;
    output += `  return false;\n`;
    output += `}\n\n`;
    output += `// ✅ After: Complexity = 5 (early returns + extracted functions)\n`;
    output += `function validateUser(user: User) {\n`;
    output += `  if (!user) return false;\n`;
    output += `  if (!isValidEmail(user.email)) return false;\n`;
    output += `  if (!isAdult(user.age)) return false;\n`;
    output += `  if (!isAllowedCountry(user.country)) return false;\n`;
    output += `  return true;\n`;
    output += `}\n\n`;
    output += `function isValidEmail(email: string): boolean {\n`;
    output += `  return !!email && email.includes('@');\n`;
    output += `}\n\n`;
    output += `function isAdult(age: number): boolean {\n`;
    output += `  return age >= 18;\n`;
    output += `}\n\n`;
    output += `function isAllowedCountry(country: string): boolean {\n`;
    output += `  return ['US', 'CA'].includes(country);\n`;
    output += `}\n`;
    output += `\`\`\`\n`;

    output += `\n---\n`;

    return output;
  }
}

// Main execution
async function main() {
  const startTime = Date.now();
  console.log('🚀 Cyclomatic Complexity Auditor Starting...\n');

  const rootDir = path.resolve(__dirname, '../..');
  const auditor = new ComplexityAuditor(rootDir);

  try {
    const analysis = await auditor.analyze();
    await auditor.saveReport(analysis);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ Analysis complete in ${duration}s`);
    console.log(`📊 Average Complexity: ${analysis.averageComplexity}`);
    console.log(`⚠️  Complex Functions: ${analysis.distribution.complex + analysis.distribution.veryComplex}`);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ComplexityAuditor, ComplexityAnalysis };
