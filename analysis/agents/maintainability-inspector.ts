#!/usr/bin/env ts-node

/**
 * Agent 2: Maintainability Inspector
 *
 * Assesses code readability, documentation quality, function complexity,
 * naming conventions, and architectural clarity.
 */

import * as fs from 'fs';
import * as path from 'path';

interface MaintainabilityIssue {
  file: string;
  line: number;
  type: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

interface MaintainabilityAnalysis {
  maintainabilityIndex: number;
  documentationCoverage: number;
  averageFunctionLength: number;
  deadCodeInstances: number;
  namingViolations: MaintainabilityIssue[];
  architecturalIssues: string[];
  refactoringOpportunities: Array<{
    priority: number;
    description: string;
    impact: string;
    files: string[];
  }>;
  stats: {
    totalFiles: number;
    totalFunctions: number;
    totalClasses: number;
    documentedFunctions: number;
    longFunctions: number;
    magicNumbers: number;
    circularDeps: number;
  };
}

class MaintainabilityInspector {
  private rootDir: string;
  private issues: MaintainabilityIssue[] = [];
  private functionLengths: number[] = [];
  private stats = {
    totalFiles: 0,
    totalFunctions: 0,
    totalClasses: 0,
    documentedFunctions: 0,
    longFunctions: 0,
    magicNumbers: 0,
    circularDeps: 0,
  };
  private imports: Map<string, Set<string>> = new Map();

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async analyze(): Promise<MaintainabilityAnalysis> {
    console.log('🔍 Starting Maintainability Analysis...');

    const sourceFiles = this.findSourceFiles();
    console.log(`📁 Found ${sourceFiles.length} source files`);
    this.stats.totalFiles = sourceFiles.length;

    for (const file of sourceFiles) {
      await this.analyzeFile(file);
    }

    this.detectCircularDependencies();

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
      const lines = content.split('\n');

      // Track imports for dependency analysis
      this.trackImports(filePath, content);

      // Various maintainability checks
      this.checkFunctionLength(filePath, content, lines);
      this.checkDocumentation(filePath, content, lines);
      this.checkNamingConventions(filePath, content, lines);
      this.checkMagicNumbers(filePath, content, lines);
      this.checkDeadCode(filePath, content, lines);
      this.checkClassSize(filePath, content, lines);

    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error);
    }
  }

  private trackImports(filePath: string, content: string): void {
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    const imports = new Set<string>();
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      // Only track local imports (not node_modules)
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        imports.add(importPath);
      }
    }

    if (imports.size > 0) {
      this.imports.set(filePath, imports);
    }
  }

  private detectCircularDependencies(): void {
    // Simplified circular dependency detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (file: string): boolean => {
      visited.add(file);
      recursionStack.add(file);

      const imports = this.imports.get(file) || new Set();
      for (const importPath of imports) {
        // Resolve relative import to absolute path
        const resolvedPath = path.resolve(path.dirname(file), importPath);

        if (!visited.has(resolvedPath)) {
          if (hasCycle(resolvedPath)) {
            this.stats.circularDeps++;
            return true;
          }
        } else if (recursionStack.has(resolvedPath)) {
          this.stats.circularDeps++;
          return true;
        }
      }

      recursionStack.delete(file);
      return false;
    };

    for (const file of this.imports.keys()) {
      if (!visited.has(file)) {
        hasCycle(file);
      }
    }
  }

  private checkFunctionLength(filePath: string, content: string, lines: string[]): void {
    // Match function declarations
    const functionRegex = /(?:async\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(.*?\)\s*=>|(\w+)\s*\(.*?\)\s*{)/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      this.stats.totalFunctions++;

      const functionName = match[1] || match[2] || match[3];
      const startLine = content.substring(0, match.index).split('\n').length;

      // Find the end of the function (simplified - looks for matching braces)
      let braceCount = 0;
      let endLine = startLine;
      let foundStart = false;

      for (let i = startLine - 1; i < lines.length && i < startLine + 200; i++) {
        const line = lines[i];
        for (const char of line) {
          if (char === '{') {
            braceCount++;
            foundStart = true;
          } else if (char === '}') {
            braceCount--;
            if (foundStart && braceCount === 0) {
              endLine = i + 1;
              break;
            }
          }
        }
        if (foundStart && braceCount === 0) break;
      }

      const functionLength = endLine - startLine + 1;
      this.functionLengths.push(functionLength);

      if (functionLength > 50) {
        this.stats.longFunctions++;
        this.issues.push({
          file: path.relative(this.rootDir, filePath),
          line: startLine,
          type: 'Long Function',
          description: `Function '${functionName}' is ${functionLength} lines (recommend <50)`,
          severity: functionLength > 100 ? 'high' : 'medium'
        });
      }
    }
  }

  private checkDocumentation(filePath: string, content: string, lines: string[]): void {
    // Check for JSDoc comments before functions
    const functionRegex = /(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|(?:const|let)\s+(\w+)\s*=)/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1] || match[2];
      const lineNum = content.substring(0, match.index).split('\n').length;

      // Check 3 lines before for documentation
      const beforeLines = lines.slice(Math.max(0, lineNum - 4), lineNum - 1);
      const hasDoc = beforeLines.some(line =>
        line.includes('/**') || line.includes('///')  || line.includes('*')
      );

      if (hasDoc) {
        this.stats.documentedFunctions++;
      } else {
        // Only flag public/exported functions
        if (match[0].includes('export')) {
          this.issues.push({
            file: path.relative(this.rootDir, filePath),
            line: lineNum,
            type: 'Missing Documentation',
            description: `Exported function '${functionName}' lacks documentation`,
            severity: 'low'
          });
        }
      }
    }
  }

  private checkNamingConventions(filePath: string, content: string, lines: string[]): void {
    // Check for single-letter variables (except common loop counters)
    const varRegex = /(?:const|let|var)\s+([a-z])\s*=/gi;
    let match;

    while ((match = varRegex.exec(content)) !== null) {
      const varName = match[1];
      const lineNum = content.substring(0, match.index).split('\n').length;

      // Allow common loop counters
      if (!['i', 'j', 'k', 'x', 'y', 'z'].includes(varName.toLowerCase())) {
        this.issues.push({
          file: path.relative(this.rootDir, filePath),
          line: lineNum,
          type: 'Poor Naming',
          description: `Single-letter variable '${varName}' - use descriptive names`,
          severity: 'low'
        });
      }
    }

    // Check for abbreviations
    const abbreviationRegex = /(?:const|let|var)\s+([a-z]{1,3}(?:[A-Z][a-z]{1,3})+)/g;
    while ((match = abbreviationRegex.exec(content)) !== null) {
      const varName = match[1];
      const lineNum = content.substring(0, match.index).split('\n').length;

      if (/[a-z]{1,2}[A-Z]/.test(varName)) {
        this.issues.push({
          file: path.relative(this.rootDir, filePath),
          line: lineNum,
          type: 'Unclear Naming',
          description: `Variable '${varName}' uses abbreviations - consider full words`,
          severity: 'low'
        });
      }
    }
  }

  private checkMagicNumbers(filePath: string, content: string, lines: string[]): void {
    // Look for numeric literals (excluding 0, 1, -1, 100, common values)
    const magicNumberRegex = /\b(\d{2,}(?!\d)|[2-9]\d+)\b/g;
    let match;
    const foundNumbers = new Set<string>();

    while ((match = magicNumberRegex.exec(content)) !== null) {
      const number = match[1];
      const lineNum = content.substring(0, match.index).split('\n').length;
      const line = lines[lineNum - 1];

      // Skip if it's in a comment, or already a constant
      if (line?.includes('//') || line?.includes('const ') || line?.includes('=')) continue;

      // Skip common values
      if (['100', '200', '404', '500', '1000'].includes(number)) continue;

      const key = `${number}-${lineNum}`;
      if (!foundNumbers.has(key)) {
        foundNumbers.add(key);
        this.stats.magicNumbers++;

        if (this.stats.magicNumbers <= 10) { // Limit issues reported
          this.issues.push({
            file: path.relative(this.rootDir, filePath),
            line: lineNum,
            type: 'Magic Number',
            description: `Hardcoded number '${number}' should be a named constant`,
            severity: 'low'
          });
        }
      }
    }
  }

  private checkDeadCode(filePath: string, content: string, lines: string[]): void {
    // Check for unreachable code after return statements
    const lines_array = content.split('\n');

    for (let i = 0; i < lines_array.length - 1; i++) {
      const line = lines_array[i].trim();

      if (line.match(/^return\b/) && !line.includes('//')) {
        // Check next non-empty line
        let nextLineIdx = i + 1;
        while (nextLineIdx < lines_array.length) {
          const nextLine = lines_array[nextLineIdx].trim();

          if (nextLine && !nextLine.startsWith('//') && !nextLine.startsWith('*')) {
            // If next line is closing brace or another function, it's OK
            if (nextLine === '}' || nextLine.startsWith('}')) {
              break;
            }

            // Otherwise it's potentially unreachable
            this.issues.push({
              file: path.relative(this.rootDir, filePath),
              line: nextLineIdx + 1,
              type: 'Unreachable Code',
              description: 'Code after return statement is unreachable',
              severity: 'medium'
            });
            break;
          }

          nextLineIdx++;
        }
      }
    }

    // Check for unused variables (simplified - looks for defined but never used)
    const varDeclarations = content.matchAll(/(?:const|let|var)\s+(\w+)\s*=/g);
    for (const match of varDeclarations) {
      const varName = match[1];
      const declIndex = match.index!;

      // Count occurrences after declaration
      const afterDecl = content.substring(declIndex + match[0].length);
      const occurrences = (afterDecl.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length;

      if (occurrences === 0) {
        const lineNum = content.substring(0, declIndex).split('\n').length;
        this.issues.push({
          file: path.relative(this.rootDir, filePath),
          line: lineNum,
          type: 'Unused Variable',
          description: `Variable '${varName}' is declared but never used`,
          severity: 'low'
        });
      }
    }
  }

  private checkClassSize(filePath: string, content: string, lines: string[]): void {
    const classRegex = /class\s+(\w+)/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      this.stats.totalClasses++;

      const className = match[1];
      const startLine = content.substring(0, match.index).split('\n').length;

      // Find the end of the class
      let braceCount = 0;
      let endLine = startLine;
      let foundStart = false;

      for (let i = startLine - 1; i < lines.length; i++) {
        const line = lines[i];
        for (const char of line) {
          if (char === '{') {
            braceCount++;
            foundStart = true;
          } else if (char === '}') {
            braceCount--;
            if (foundStart && braceCount === 0) {
              endLine = i + 1;
              break;
            }
          }
        }
        if (foundStart && braceCount === 0) break;
      }

      const classLength = endLine - startLine + 1;

      if (classLength > 500) {
        this.issues.push({
          file: path.relative(this.rootDir, filePath),
          line: startLine,
          type: 'Large Class',
          description: `Class '${className}' is ${classLength} lines (recommend <500)`,
          severity: 'high'
        });
      }
    }
  }

  private generateReport(): MaintainabilityAnalysis {
    // Calculate metrics
    const averageFunctionLength = this.functionLengths.length > 0
      ? Math.round(this.functionLengths.reduce((a, b) => a + b, 0) / this.functionLengths.length)
      : 0;

    const documentationCoverage = this.stats.totalFunctions > 0
      ? Math.round((this.stats.documentedFunctions / this.stats.totalFunctions) * 100)
      : 0;

    const maintainabilityIndex = this.calculateMaintainabilityIndex();

    const deadCodeInstances = this.issues.filter(i =>
      i.type === 'Unreachable Code' || i.type === 'Unused Variable'
    ).length;

    const namingViolations = this.issues.filter(i =>
      i.type === 'Poor Naming' || i.type === 'Unclear Naming'
    ).slice(0, 10);

    const architecturalIssues = this.identifyArchitecturalIssues();
    const refactoringOpportunities = this.identifyRefactoringOpportunities();

    return {
      maintainabilityIndex,
      documentationCoverage,
      averageFunctionLength,
      deadCodeInstances,
      namingViolations,
      architecturalIssues,
      refactoringOpportunities,
      stats: this.stats
    };
  }

  private calculateMaintainabilityIndex(): number {
    let score = 100;

    // Deduct for long functions
    score -= Math.min(20, this.stats.longFunctions * 2);

    // Deduct for poor documentation
    const docCoverage = this.stats.totalFunctions > 0
      ? (this.stats.documentedFunctions / this.stats.totalFunctions) * 100
      : 100;
    if (docCoverage < 50) score -= 15;
    else if (docCoverage < 80) score -= 5;

    // Deduct for issues
    const highIssues = this.issues.filter(i => i.severity === 'high').length;
    const mediumIssues = this.issues.filter(i => i.severity === 'medium').length;

    score -= highIssues * 3;
    score -= mediumIssues * 1;

    // Deduct for magic numbers
    score -= Math.min(10, this.stats.magicNumbers * 0.5);

    // Deduct for circular dependencies
    score -= this.stats.circularDeps * 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private identifyArchitecturalIssues(): string[] {
    const issues: string[] = [];

    if (this.stats.circularDeps > 0) {
      issues.push(`Found ${this.stats.circularDeps} circular dependencies - refactor to eliminate cycles`);
    }

    const avgImports = Array.from(this.imports.values())
      .reduce((sum, imports) => sum + imports.size, 0) / this.imports.size;

    if (avgImports > 10) {
      issues.push(`High average imports per file (${avgImports.toFixed(1)}) - consider reducing coupling`);
    }

    if (this.stats.longFunctions > this.stats.totalFunctions * 0.3) {
      issues.push('Over 30% of functions are too long - poor separation of concerns');
    }

    const largeClasses = this.issues.filter(i => i.type === 'Large Class').length;
    if (largeClasses > 0) {
      issues.push(`${largeClasses} large classes found - consider splitting responsibilities`);
    }

    return issues;
  }

  private identifyRefactoringOpportunities(): Array<{
    priority: number;
    description: string;
    impact: string;
    files: string[];
  }> {
    const opportunities: Array<any> = [];

    // Long functions
    const longFuncFiles = [...new Set(
      this.issues
        .filter(i => i.type === 'Long Function')
        .map(i => i.file)
    )];

    if (longFuncFiles.length > 0) {
      opportunities.push({
        priority: 1,
        description: 'Extract long functions into smaller, focused functions',
        impact: 'High - improves testability and readability',
        files: longFuncFiles.slice(0, 5)
      });
    }

    // Magic numbers
    const magicNumFiles = [...new Set(
      this.issues
        .filter(i => i.type === 'Magic Number')
        .map(i => i.file)
    )];

    if (magicNumFiles.length > 0) {
      opportunities.push({
        priority: 2,
        description: 'Replace magic numbers with named constants',
        impact: 'Medium - improves code clarity',
        files: magicNumFiles.slice(0, 5)
      });
    }

    // Documentation
    if (this.stats.documentedFunctions / this.stats.totalFunctions < 0.5) {
      opportunities.push({
        priority: 2,
        description: 'Add JSDoc documentation to public functions',
        impact: 'Medium - improves maintainability',
        files: ['All files with exported functions']
      });
    }

    // Dead code
    const deadCodeFiles = [...new Set(
      this.issues
        .filter(i => i.type === 'Unreachable Code' || i.type === 'Unused Variable')
        .map(i => i.file)
    )];

    if (deadCodeFiles.length > 0) {
      opportunities.push({
        priority: 3,
        description: 'Remove unreachable and unused code',
        impact: 'Low - reduces bundle size and confusion',
        files: deadCodeFiles.slice(0, 5)
      });
    }

    return opportunities;
  }

  async saveReport(analysis: MaintainabilityAnalysis): Promise<void> {
    const reportPath = path.join(this.rootDir, 'analysis', 'ANALYSIS_REPORT.md');
    let reportContent = fs.readFileSync(reportPath, 'utf-8');

    const section = this.formatReportSection(analysis);

    reportContent = reportContent.replace(
      /## Maintainability Analysis\n\n[\s\S]*?(?=\n---\n\n## |$)/,
      `## Maintainability Analysis\n\n${section}\n`
    );

    fs.writeFileSync(reportPath, reportContent, 'utf-8');
    console.log('✅ Maintainability analysis saved to ANALYSIS_REPORT.md');

    const dataPath = path.join(this.rootDir, 'analysis', 'data', 'maintainability-raw.json');
    fs.writeFileSync(dataPath, JSON.stringify({
      analysis,
      issues: this.issues,
      timestamp: new Date().toISOString()
    }, null, 2));
    console.log('✅ Raw data saved to data/maintainability-raw.json');
  }

  private formatReportSection(analysis: MaintainabilityAnalysis): string {
    let output = `**Maintainability Index:** ${analysis.maintainabilityIndex}/100\n\n`;

    output += `### Key Metrics\n\n`;
    output += `- **Documentation Coverage:** ${analysis.documentationCoverage}%\n`;
    output += `- **Average Function Length:** ${analysis.averageFunctionLength} lines\n`;
    output += `- **Total Files:** ${analysis.stats.totalFiles}\n`;
    output += `- **Total Functions:** ${analysis.stats.totalFunctions}\n`;
    output += `- **Long Functions (>50 lines):** ${analysis.stats.longFunctions}\n`;
    output += `- **Dead Code Instances:** ${analysis.deadCodeInstances}\n`;
    output += `- **Magic Numbers:** ${analysis.stats.magicNumbers}\n`;
    output += `- **Circular Dependencies:** ${analysis.stats.circularDeps}\n\n`;

    output += `### Naming Convention Violations (Top 10)\n\n`;
    if (analysis.namingViolations.length === 0) {
      output += `✅ No major naming convention violations found!\n\n`;
    } else {
      for (const issue of analysis.namingViolations) {
        output += `- ${issue.file}:${issue.line} - ${issue.description}\n`;
      }
      output += `\n`;
    }

    output += `### Architectural Issues\n\n`;
    if (analysis.architecturalIssues.length === 0) {
      output += `✅ No major architectural issues detected!\n\n`;
    } else {
      for (const issue of analysis.architecturalIssues) {
        output += `- ${issue}\n`;
      }
      output += `\n`;
    }

    output += `### Refactoring Opportunities (Prioritized)\n\n`;
    for (const opp of analysis.refactoringOpportunities) {
      output += `**Priority ${opp.priority}: ${opp.description}**\n`;
      output += `- Impact: ${opp.impact}\n`;
      output += `- Files: ${opp.files.join(', ')}\n\n`;
    }

    output += `### Example Refactoring\n\n`;
    output += `\`\`\`typescript\n`;
    output += `// ❌ Before: Long function with magic numbers\n`;
    output += `function processOrder(order: any) {\n`;
    output += `  if (order.total > 1000) {\n`;
    output += `    order.discount = order.total * 0.1;\n`;
    output += `  }\n`;
    output += `  if (order.items.length > 5) {\n`;
    output += `    order.shippingCost = 0;\n`;
    output += `  } else {\n`;
    output += `    order.shippingCost = 9.99;\n`;
    output += `  }\n`;
    output += `  // ... 40 more lines\n`;
    output += `}\n\n`;
    output += `// ✅ After: Extracted functions with named constants\n`;
    output += `const DISCOUNT_THRESHOLD = 1000;\n`;
    output += `const DISCOUNT_RATE = 0.1;\n`;
    output += `const FREE_SHIPPING_ITEM_COUNT = 5;\n`;
    output += `const STANDARD_SHIPPING_COST = 9.99;\n\n`;
    output += `function processOrder(order: Order) {\n`;
    output += `  applyDiscount(order);\n`;
    output += `  calculateShipping(order);\n`;
    output += `  // ... other focused operations\n`;
    output += `}\n\n`;
    output += `function applyDiscount(order: Order) {\n`;
    output += `  if (order.total > DISCOUNT_THRESHOLD) {\n`;
    output += `    order.discount = order.total * DISCOUNT_RATE;\n`;
    output += `  }\n`;
    output += `}\n\n`;
    output += `function calculateShipping(order: Order) {\n`;
    output += `  order.shippingCost = order.items.length >= FREE_SHIPPING_ITEM_COUNT\n`;
    output += `    ? 0\n`;
    output += `    : STANDARD_SHIPPING_COST;\n`;
    output += `}\n`;
    output += `\`\`\`\n`;

    output += `\n---\n`;

    return output;
  }
}

// Main execution
async function main() {
  const startTime = Date.now();
  console.log('🚀 Maintainability Inspector Agent Starting...\n');

  const rootDir = path.resolve(__dirname, '../..');
  const inspector = new MaintainabilityInspector(rootDir);

  try {
    const analysis = await inspector.analyze();
    await inspector.saveReport(analysis);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ Analysis complete in ${duration}s`);
    console.log(`📊 Maintainability Index: ${analysis.maintainabilityIndex}/100`);
    console.log(`📝 Documentation Coverage: ${analysis.documentationCoverage}%`);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { MaintainabilityInspector, MaintainabilityAnalysis };
