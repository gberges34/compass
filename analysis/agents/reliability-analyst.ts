#!/usr/bin/env ts-node

/**
 * Agent 1: Reliability Analyst
 *
 * Evaluates error handling, input validation, edge case handling,
 * and other reliability patterns in the codebase.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ReliabilityIssue {
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  description: string;
  codeSnippet?: string;
}

interface ReliabilityAnalysis {
  overallScore: number;
  criticalIssues: ReliabilityIssue[];
  errorHandlingCoverage: number;
  topRiskAreas: Array<{ area: string; issues: number; severity: string }>;
  recommendations: string[];
  stats: {
    totalFunctions: number;
    functionsWithErrorHandling: number;
    asyncFunctionsWithoutTryCatch: number;
    missingInputValidation: number;
    unhandledPromises: number;
  };
}

class ReliabilityAnalyst {
  private rootDir: string;
  private issues: ReliabilityIssue[] = [];
  private stats = {
    totalFunctions: 0,
    functionsWithErrorHandling: 0,
    asyncFunctionsWithoutTryCatch: 0,
    missingInputValidation: 0,
    unhandledPromises: 0,
  };

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async analyze(): Promise<ReliabilityAnalysis> {
    console.log('🔍 Starting Reliability Analysis...');

    const sourceFiles = this.findSourceFiles();
    console.log(`📁 Found ${sourceFiles.length} source files to analyze`);

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
      const lines = content.split('\n');

      // Analyze error handling patterns
      this.checkAsyncFunctionsWithoutTryCatch(filePath, content, lines);
      this.checkUnhandledPromises(filePath, content, lines);
      this.checkInputValidation(filePath, content, lines);
      this.checkNullUndefinedChecks(filePath, content, lines);
      this.checkResourceCleanup(filePath, content, lines);
      this.checkErrorLogging(filePath, content, lines);

    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error);
    }
  }

  private checkAsyncFunctionsWithoutTryCatch(filePath: string, content: string, lines: string[]): void {
    // Match async functions
    const asyncFunctionRegex = /async\s+(function\s+\w+|[\w]+\s*(?::\s*\w+)?\s*=\s*async|\(.*?\)\s*=>|[\w]+\s*\(.*?\))/g;
    let match;

    while ((match = asyncFunctionRegex.exec(content)) !== null) {
      this.stats.totalFunctions++;

      const startPos = match.index;
      const lineNum = content.substring(0, startPos).split('\n').length;

      // Find the function body (simplified - looks ahead ~50 lines)
      const functionBody = lines.slice(lineNum - 1, lineNum + 50).join('\n');

      // Check if there's a try-catch in the function body
      const hasTryCatch = /try\s*{[\s\S]*?}\s*catch/.test(functionBody);

      if (hasTryCatch) {
        this.stats.functionsWithErrorHandling++;
      } else {
        this.stats.asyncFunctionsWithoutTryCatch++;
        this.issues.push({
          file: path.relative(this.rootDir, filePath),
          line: lineNum,
          severity: 'high',
          type: 'Missing Error Handling',
          description: 'Async function without try-catch block',
          codeSnippet: lines[lineNum - 1]?.trim()
        });
      }
    }
  }

  private checkUnhandledPromises(filePath: string, content: string, lines: string[]): void {
    // Check for .then() without .catch()
    const thenWithoutCatchRegex = /\.then\([^)]+\)(?!\s*\.catch)/g;
    let match;

    while ((match = thenWithoutCatchRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;

      // Skip if part of a longer chain that has .catch() later
      const nextChars = content.substring(match.index, match.index + 200);
      if (!nextChars.includes('.catch(')) {
        this.stats.unhandledPromises++;
        this.issues.push({
          file: path.relative(this.rootDir, filePath),
          line: lineNum,
          severity: 'high',
          type: 'Unhandled Promise',
          description: 'Promise .then() without .catch() handler',
          codeSnippet: lines[lineNum - 1]?.trim()
        });
      }
    }

    // Check for await without try-catch (if not in a function we already flagged)
    const awaitRegex = /await\s+/g;
    while ((match = awaitRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const line = lines[lineNum - 1];

      // Check if this await is inside a try block (simplified check)
      const beforeContext = lines.slice(Math.max(0, lineNum - 10), lineNum - 1).join('\n');
      const hasTry = beforeContext.includes('try {');

      if (!hasTry && !line?.includes('//')) {
        // Don't double-count if we already flagged the function
        // This is a simplified heuristic
      }
    }
  }

  private checkInputValidation(filePath: string, content: string, lines: string[]): void {
    // Look for route handlers and public functions without validation
    const routeHandlerRegex = /(router\.(get|post|put|delete|patch)|app\.(get|post|put|delete|patch))\s*\([^,]+,\s*(?:async\s*)?\([^)]*\)\s*(?:=>|{)/g;
    let match;

    while ((match = routeHandlerRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const handlerBody = lines.slice(lineNum - 1, lineNum + 30).join('\n');

      // Check for validation keywords
      const hasValidation = /\b(validate|schema|check|validator|zod|parse)\b/i.test(handlerBody);

      if (!hasValidation) {
        this.stats.missingInputValidation++;
        this.issues.push({
          file: path.relative(this.rootDir, filePath),
          line: lineNum,
          severity: 'medium',
          type: 'Missing Input Validation',
          description: 'Route handler without apparent input validation',
          codeSnippet: lines[lineNum - 1]?.trim()
        });
      }
    }
  }

  private checkNullUndefinedChecks(filePath: string, content: string, lines: string[]): void {
    // Look for property access without null checks (simplified heuristic)
    const propertyAccessRegex = /(\w+)\.(\w+)\.(\w+)/g;
    let match;
    let checkedInFile = 0;

    while ((match = propertyAccessRegex.exec(content)) !== null && checkedInFile < 5) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const line = lines[lineNum - 1];

      // Skip if there's an optional chaining or nullish coalescing
      if (line?.includes('?.') || line?.includes('??')) continue;

      // Check if there's a null check before this line
      const beforeContext = lines.slice(Math.max(0, lineNum - 5), lineNum - 1).join('\n');
      const hasNullCheck = new RegExp(`${match[1]}\\s*(?:===|!==|==|!=)\\s*(?:null|undefined)`).test(beforeContext);

      if (!hasNullCheck && !line?.includes('//') && checkedInFile < 3) {
        checkedInFile++;
        this.issues.push({
          file: path.relative(this.rootDir, filePath),
          line: lineNum,
          severity: 'low',
          type: 'Potential Null/Undefined Access',
          description: 'Deep property access without null checking',
          codeSnippet: line?.trim()
        });
      }
    }
  }

  private checkResourceCleanup(filePath: string, content: string, lines: string[]): void {
    // Check for file operations without cleanup
    const fileOperationsRegex = /(fs\.open|fs\.createReadStream|fs\.createWriteStream)\(/g;
    let match;

    while ((match = fileOperationsRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const afterContext = lines.slice(lineNum - 1, lineNum + 20).join('\n');

      const hasCleanup = /\.close\(|\.end\(|finally\s*{/.test(afterContext);

      if (!hasCleanup) {
        this.issues.push({
          file: path.relative(this.rootDir, filePath),
          line: lineNum,
          severity: 'medium',
          type: 'Resource Leak Risk',
          description: 'File operation without explicit cleanup/close',
          codeSnippet: lines[lineNum - 1]?.trim()
        });
      }
    }
  }

  private checkErrorLogging(filePath: string, content: string, lines: string[]): void {
    // Check catch blocks without logging
    const catchBlockRegex = /catch\s*\(\s*(\w+)\s*\)\s*{/g;
    let match;

    while ((match = catchBlockRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const errorVar = match[1];
      const catchBody = lines.slice(lineNum, lineNum + 10).join('\n');

      // Check if error is logged or at least referenced
      const hasLogging = new RegExp(`(console\\.(log|error|warn)|logger\\.|log\\.|${errorVar})`).test(catchBody);

      if (!hasLogging) {
        this.issues.push({
          file: path.relative(this.rootDir, filePath),
          line: lineNum,
          severity: 'low',
          type: 'Silent Error Handling',
          description: 'Catch block without error logging',
          codeSnippet: lines[lineNum - 1]?.trim()
        });
      }
    }
  }

  private generateReport(): ReliabilityAnalysis {
    // Calculate error handling coverage
    const errorHandlingCoverage = this.stats.totalFunctions > 0
      ? Math.round((this.stats.functionsWithErrorHandling / this.stats.totalFunctions) * 100)
      : 0;

    // Calculate overall score (0-100)
    const overallScore = this.calculateOverallScore();

    // Get critical issues
    const criticalIssues = this.issues
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .slice(0, 20);

    // Identify top risk areas
    const riskAreas = this.identifyRiskAreas();

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    return {
      overallScore,
      criticalIssues,
      errorHandlingCoverage,
      topRiskAreas: riskAreas,
      recommendations,
      stats: this.stats
    };
  }

  private calculateOverallScore(): number {
    let score = 100;

    // Deduct points for issues
    const criticalCount = this.issues.filter(i => i.severity === 'critical').length;
    const highCount = this.issues.filter(i => i.severity === 'high').length;
    const mediumCount = this.issues.filter(i => i.severity === 'medium').length;
    const lowCount = this.issues.filter(i => i.severity === 'low').length;

    score -= criticalCount * 10;
    score -= highCount * 5;
    score -= mediumCount * 2;
    score -= lowCount * 0.5;

    // Bonus for good error handling coverage
    if (this.stats.totalFunctions > 0) {
      const coverage = (this.stats.functionsWithErrorHandling / this.stats.totalFunctions) * 100;
      if (coverage > 80) score += 10;
      else if (coverage < 30) score -= 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private identifyRiskAreas(): Array<{ area: string; issues: number; severity: string }> {
    const areaMap = new Map<string, { issues: number; maxSeverity: number }>();

    for (const issue of this.issues) {
      const area = issue.type;
      const current = areaMap.get(area) || { issues: 0, maxSeverity: 0 };
      current.issues++;

      const severityLevel = { critical: 4, high: 3, medium: 2, low: 1 }[issue.severity];
      current.maxSeverity = Math.max(current.maxSeverity, severityLevel);

      areaMap.set(area, current);
    }

    const severityNames = ['', 'low', 'medium', 'high', 'critical'];
    return Array.from(areaMap.entries())
      .map(([area, data]) => ({
        area,
        issues: data.issues,
        severity: severityNames[data.maxSeverity]
      }))
      .sort((a, b) => b.issues - a.issues)
      .slice(0, 5);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.stats.asyncFunctionsWithoutTryCatch > 5) {
      recommendations.push('Wrap async functions in try-catch blocks to handle errors gracefully');
    }

    if (this.stats.unhandledPromises > 3) {
      recommendations.push('Add .catch() handlers to all promises or use async/await with try-catch');
    }

    if (this.stats.missingInputValidation > 5) {
      recommendations.push('Implement input validation for all API route handlers (consider using Zod or similar)');
    }

    const errorHandlingCoverage = this.stats.totalFunctions > 0
      ? (this.stats.functionsWithErrorHandling / this.stats.totalFunctions) * 100
      : 0;

    if (errorHandlingCoverage < 50) {
      recommendations.push('Increase error handling coverage to at least 80% of async functions');
    }

    recommendations.push('Consider implementing a global error handler for consistent error responses');
    recommendations.push('Add error logging/monitoring service integration (e.g., Sentry, LogRocket)');

    return recommendations.slice(0, 6);
  }

  async saveReport(analysis: ReliabilityAnalysis): Promise<void> {
    const reportPath = path.join(this.rootDir, 'analysis', 'ANALYSIS_REPORT.md');
    let reportContent = fs.readFileSync(reportPath, 'utf-8');

    const reliabilitySection = this.formatReportSection(analysis);

    // Replace the Reliability Analysis section
    reportContent = reportContent.replace(
      /## Reliability Analysis\n\n[\s\S]*?(?=\n---\n\n## |$)/,
      `## Reliability Analysis\n\n${reliabilitySection}\n`
    );

    fs.writeFileSync(reportPath, reportContent, 'utf-8');
    console.log('✅ Reliability analysis saved to ANALYSIS_REPORT.md');

    // Save raw data
    const dataPath = path.join(this.rootDir, 'analysis', 'data', 'reliability-raw.json');
    fs.writeFileSync(dataPath, JSON.stringify({
      analysis,
      issues: this.issues,
      timestamp: new Date().toISOString()
    }, null, 2));
    console.log('✅ Raw data saved to data/reliability-raw.json');
  }

  private formatReportSection(analysis: ReliabilityAnalysis): string {
    let output = `**Overall Score:** ${analysis.overallScore}/100\n\n`;

    output += `### Key Metrics\n\n`;
    output += `- **Total Functions Analyzed:** ${analysis.stats.totalFunctions}\n`;
    output += `- **Error Handling Coverage:** ${analysis.errorHandlingCoverage}%\n`;
    output += `- **Async Functions Without Try-Catch:** ${analysis.stats.asyncFunctionsWithoutTryCatch}\n`;
    output += `- **Unhandled Promises:** ${analysis.stats.unhandledPromises}\n`;
    output += `- **Missing Input Validation:** ${analysis.stats.missingInputValidation}\n\n`;

    output += `### Critical Issues (Top 10)\n\n`;
    if (analysis.criticalIssues.length === 0) {
      output += `✅ No critical reliability issues found!\n\n`;
    } else {
      for (const issue of analysis.criticalIssues.slice(0, 10)) {
        output += `- **[${issue.severity.toUpperCase()}]** ${issue.file}:${issue.line}\n`;
        output += `  - ${issue.type}: ${issue.description}\n`;
        if (issue.codeSnippet) {
          output += `  - Code: \`${issue.codeSnippet}\`\n`;
        }
        output += `\n`;
      }
    }

    output += `### Top 5 Risk Areas\n\n`;
    for (const area of analysis.topRiskAreas) {
      output += `1. **${area.area}** - ${area.issues} issues (${area.severity} severity)\n`;
    }
    output += `\n`;

    output += `### Recommendations\n\n`;
    for (let i = 0; i < analysis.recommendations.length; i++) {
      output += `${i + 1}. ${analysis.recommendations[i]}\n`;
    }
    output += `\n`;

    output += `### Example Fix\n\n`;
    output += `\`\`\`typescript\n`;
    output += `// ❌ Before: Async function without error handling\n`;
    output += `async function fetchUserData(userId: string) {\n`;
    output += `  const response = await fetch(\`/api/users/\${userId}\`);\n`;
    output += `  return response.json();\n`;
    output += `}\n\n`;
    output += `// ✅ After: Proper error handling\n`;
    output += `async function fetchUserData(userId: string) {\n`;
    output += `  try {\n`;
    output += `    const response = await fetch(\`/api/users/\${userId}\`);\n`;
    output += `    if (!response.ok) {\n`;
    output += `      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);\n`;
    output += `    }\n`;
    output += `    return await response.json();\n`;
    output += `  } catch (error) {\n`;
    output += `    console.error('Failed to fetch user data:', error);\n`;
    output += `    throw new Error(\`Unable to fetch user \${userId}\`);\n`;
    output += `  }\n`;
    output += `}\n`;
    output += `\`\`\`\n`;

    output += `\n---\n`;

    return output;
  }
}

// Main execution
async function main() {
  const startTime = Date.now();
  console.log('🚀 Reliability Analyst Agent Starting...\n');

  const rootDir = path.resolve(__dirname, '../..');
  const analyst = new ReliabilityAnalyst(rootDir);

  try {
    const analysis = await analyst.analyze();
    await analyst.saveReport(analysis);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ Analysis complete in ${duration}s`);
    console.log(`📊 Overall Score: ${analysis.overallScore}/100`);
    console.log(`⚠️  Found ${analysis.criticalIssues.length} critical issues`);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ReliabilityAnalyst, ReliabilityAnalysis };
