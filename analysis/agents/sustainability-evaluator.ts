#!/usr/bin/env ts-node

/**
 * Agent 8: Sustainability Metrics Evaluator
 *
 * Assesses resource optimization and algorithmic efficiency.
 */

import * as fs from 'fs';
import * as path from 'path';

interface SustainabilityAnalysis {
  algorithmicEfficiency: number;
  memoryOptimization: number;
  topResourceIntensiveOps: Array<{
    file: string;
    line: number;
    operation: string;
    complexity: string;
    issue: string;
  }>;
  databaseIssues: Array<{ file: string; line: number; issue: string }>;
  networkOptimizations: string[];
  bundleAnalysis: {
    estimatedSize: string;
    recommendations: string[];
  };
  performanceRecommendations: string[];
}

class SustainabilityEvaluator {
  private rootDir: string;
  private issues: Array<any> = [];

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async analyze(): Promise<SustainabilityAnalysis> {
    console.log('🔍 Starting Sustainability Analysis...');

    const sourceFiles = this.findSourceFiles();
    console.log(`📁 Analyzing ${sourceFiles.length} files`);

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
        // Skip
      }

      return results;
    };

    return findFiles(this.rootDir);
  }

  private async analyzeFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      this.detectAlgorithmicIssues(filePath, content, lines);
      this.detectDatabaseIssues(filePath, content, lines);
      this.detectMemoryIssues(filePath, content, lines);

    } catch (error) {
      // Skip
    }
  }

  private detectAlgorithmicIssues(filePath: string, content: string, lines: string[]): void {
    // Nested loops (O(n²) or worse)
    const nestedLoopRegex = /for\s*\([^)]+\)\s*{[^}]*for\s*\([^)]+\)/gs;
    let match;

    while ((match = nestedLoopRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      this.issues.push({
        file: path.relative(this.rootDir, filePath),
        line: lineNum,
        type: 'algorithmic',
        operation: 'Nested loops',
        complexity: 'O(n²)',
        issue: 'Potential performance bottleneck with nested iteration'
      });
    }

    // Array operations in loops
    const arrayInLoopRegex = /for\s*\([^)]+\)\s*{[^}]*\.(concat|push|filter|map)/gs;
    while ((match = arrayInLoopRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      this.issues.push({
        file: path.relative(this.rootDir, filePath),
        line: lineNum,
        type: 'algorithmic',
        operation: 'Array operation in loop',
        complexity: 'O(n²)',
        issue: 'Inefficient array manipulation - consider single-pass solution'
      });
    }
  }

  private detectDatabaseIssues(filePath: string, content: string, lines: string[]): void {
    // Query in loop (N+1 problem)
    if (content.includes('for') && (content.includes('.find') || content.includes('.findOne') || content.includes('SELECT'))) {
      const forRegex = /for\s*\(/g;
      let match;

      while ((match = forRegex.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        const nextLines = lines.slice(lineNum, lineNum + 10).join('\n');

        if (nextLines.includes('.find') || nextLines.includes('SELECT')) {
          this.issues.push({
            file: path.relative(this.rootDir, filePath),
            line: lineNum,
            type: 'database',
            issue: 'Potential N+1 query problem - query inside loop'
          });
        }
      }
    }

    // SELECT * usage
    if (content.includes('SELECT *')) {
      const selectRegex = /SELECT\s+\*/gi;
      let match;

      while ((match = selectRegex.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        this.issues.push({
          file: path.relative(this.rootDir, filePath),
          line: lineNum,
          type: 'database',
          issue: 'SELECT * fetches unnecessary data - specify columns'
        });
      }
    }
  }

  private detectMemoryIssues(filePath: string, content: string, lines: string[]): void {
    // Large array operations
    if (content.includes('.concat(') || content.includes('new Array(')) {
      this.issues.push({
        file: path.relative(this.rootDir, filePath),
        line: 0,
        type: 'memory',
        issue: 'Potential memory allocation issue - review array operations'
      });
    }
  }

  private generateReport(): SustainabilityAnalysis {
    const algorithmicIssues = this.issues.filter(i => i.type === 'algorithmic');
    const databaseIssues = this.issues.filter(i => i.type === 'database');
    const memoryIssues = this.issues.filter(i => i.type === 'memory');

    const algorithmicScore = Math.max(0, 100 - (algorithmicIssues.length * 10));
    const memoryScore = Math.max(0, 100 - (memoryIssues.length * 15));

    const topResourceIntensive = algorithmicIssues
      .slice(0, 10)
      .map(issue => ({
        file: issue.file,
        line: issue.line,
        operation: issue.operation,
        complexity: issue.complexity,
        issue: issue.issue
      }));

    const dbIssues = databaseIssues.slice(0, 10);

    const networkOptimizations = this.identifyNetworkOptimizations();
    const bundleAnalysis = this.analyzeBundleSize();
    const performanceRecommendations = this.generateRecommendations(
      algorithmicIssues.length,
      databaseIssues.length,
      memoryIssues.length
    );

    return {
      algorithmicEfficiency: algorithmicScore,
      memoryOptimization: memoryScore,
      topResourceIntensiveOps: topResourceIntensive,
      databaseIssues: dbIssues,
      networkOptimizations,
      bundleAnalysis,
      performanceRecommendations
    };
  }

  private identifyNetworkOptimizations(): string[] {
    const opts: string[] = [];

    opts.push('Consider implementing request caching for frequently accessed data');
    opts.push('Batch multiple API calls where possible to reduce round trips');
    opts.push('Use pagination for large data sets');
    opts.push('Implement HTTP/2 or HTTP/3 for multiplexing');

    return opts;
  }

  private analyzeBundleSize(): any {
    // Check if package.json exists to estimate bundle size
    const packagePath = path.join(this.rootDir, 'package.json');

    if (fs.existsSync(packagePath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
        const depCount = Object.keys(pkg.dependencies || {}).length;

        return {
          estimatedSize: depCount > 50 ? 'Large (>50 dependencies)' :
                        depCount > 20 ? 'Medium (20-50 dependencies)' : 'Small (<20 dependencies)',
          recommendations: [
            'Analyze bundle with webpack-bundle-analyzer',
            'Consider code splitting for large features',
            'Tree-shake unused exports',
            'Use dynamic imports for rarely-used code'
          ]
        };
      } catch {
        // Skip
      }
    }

    return {
      estimatedSize: 'Unknown',
      recommendations: ['Run bundle analysis tool to identify optimization opportunities']
    };
  }

  private generateRecommendations(algorithmicCount: number, dbCount: number, memoryCount: number): string[] {
    const recs: string[] = [];

    if (algorithmicCount > 5) {
      recs.push('Refactor nested loops to use more efficient algorithms (e.g., hash maps, single-pass solutions)');
    }

    if (dbCount > 3) {
      recs.push('Optimize database queries - use eager loading, indexing, and query batching');
    }

    if (memoryCount > 3) {
      recs.push('Review memory allocation patterns - consider streaming for large data sets');
    }

    recs.push('Implement performance monitoring (e.g., Lighthouse, Web Vitals)');
    recs.push('Profile hot code paths with Chrome DevTools or Node.js profiler');

    return recs;
  }

  async saveReport(analysis: SustainabilityAnalysis): Promise<void> {
    const reportPath = path.join(this.rootDir, 'analysis', 'ANALYSIS_REPORT.md');
    let reportContent = fs.readFileSync(reportPath, 'utf-8');

    const section = this.formatReportSection(analysis);

    reportContent = reportContent.replace(
      /## Sustainability Metrics\n\n[\s\S]*?(?=\n---\n\n## |$)/,
      `## Sustainability Metrics\n\n${section}\n`
    );

    fs.writeFileSync(reportPath, reportContent, 'utf-8');
    console.log('✅ Sustainability analysis saved to ANALYSIS_REPORT.md');

    const dataPath = path.join(this.rootDir, 'analysis', 'data', 'sustainability-raw.json');
    fs.writeFileSync(dataPath, JSON.stringify({ analysis, issues: this.issues, timestamp: new Date().toISOString() }, null, 2));
  }

  private formatReportSection(analysis: SustainabilityAnalysis): string {
    let output = `**Algorithmic Efficiency Score:** ${analysis.algorithmicEfficiency}/100\n`;
    output += `**Memory Optimization Score:** ${analysis.memoryOptimization}/100\n\n`;

    output += `### Top 10 Resource-Intensive Operations\n\n`;
    if (analysis.topResourceIntensiveOps.length === 0) {
      output += `✅ No major algorithmic inefficiencies detected!\n\n`;
    } else {
      output += `| File:Line | Operation | Complexity | Issue |\n`;
      output += `|-----------|-----------|------------|-------|\n`;
      for (const op of analysis.topResourceIntensiveOps) {
        output += `| ${op.file}:${op.line} | ${op.operation} | ${op.complexity} | ${op.issue} |\n`;
      }
      output += `\n`;
    }

    output += `### Database Query Issues\n\n`;
    if (analysis.databaseIssues.length === 0) {
      output += `✅ No database efficiency issues found\n\n`;
    } else {
      for (const issue of analysis.databaseIssues) {
        output += `- **${issue.file}:${issue.line}** - ${issue.issue}\n`;
      }
      output += `\n`;
    }

    output += `### Network Optimization Opportunities\n\n`;
    for (const opt of analysis.networkOptimizations) {
      output += `- ${opt}\n`;
    }
    output += `\n`;

    output += `### Bundle Size Analysis\n\n`;
    output += `- **Estimated Size:** ${analysis.bundleAnalysis.estimatedSize}\n\n`;
    output += `**Recommendations:**\n`;
    for (const rec of analysis.bundleAnalysis.recommendations) {
      output += `- ${rec}\n`;
    }
    output += `\n`;

    output += `### Performance Improvement Recommendations\n\n`;
    for (let i = 0; i < analysis.performanceRecommendations.length; i++) {
      output += `${i + 1}. ${analysis.performanceRecommendations[i]}\n`;
    }
    output += `\n`;

    output += `### Example Optimization\n\n`;
    output += `\`\`\`typescript\n`;
    output += `// ❌ Before: O(n²) nested loops\n`;
    output += `for (const user of users) {\n`;
    output += `  for (const order of orders) {\n`;
    output += `    if (order.userId === user.id) {\n`;
    output += `      user.orders.push(order);\n`;
    output += `    }\n`;
    output += `  }\n`;
    output += `}\n\n`;
    output += `// ✅ After: O(n) with hash map\n`;
    output += `const ordersByUser = orders.reduce((acc, order) => {\n`;
    output += `  if (!acc[order.userId]) acc[order.userId] = [];\n`;
    output += `  acc[order.userId].push(order);\n`;
    output += `  return acc;\n`;
    output += `}, {});\n\n`;
    output += `for (const user of users) {\n`;
    output += `  user.orders = ordersByUser[user.id] || [];\n`;
    output += `}\n`;
    output += `\`\`\`\n`;

    output += `\n---\n`;

    return output;
  }
}

async function main() {
  const startTime = Date.now();
  console.log('🚀 Sustainability Evaluator Starting...\n');

  const rootDir = path.resolve(__dirname, '../..');
  const evaluator = new SustainabilityEvaluator(rootDir);

  try {
    const analysis = await evaluator.analyze();
    await evaluator.saveReport(analysis);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ Analysis complete in ${duration}s`);
    console.log(`📊 Algorithmic Efficiency: ${analysis.algorithmicEfficiency}/100`);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SustainabilityEvaluator, SustainabilityAnalysis };
