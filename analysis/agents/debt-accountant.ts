#!/usr/bin/env ts-node

/**
 * Agent 7: Technical Debt Accountant
 *
 * Calculates technical debt ratio and provides payoff roadmap.
 */

import * as fs from 'fs';
import * as path from 'path';

interface DebtAnalysis {
  totalDebtRatio: number;
  estimatedFixTime: number;
  estimatedDevTime: number;
  debtBreakdown: {
    codeSmells: number;
    todoItems: number;
    deprecatedAPIs: number;
    securityIssues: number;
  };
  quickWins: Array<{ description: string; effort: string; impact: string }>;
  payoffRoadmap: {
    sprint30Days: string[];
    sprint60Days: string[];
    sprint90Days: string[];
  };
  roiAnalysis: string[];
}

class DebtAccountant {
  private rootDir: string;
  private debtItems = {
    todos: 0,
    longMethods: 0,
    largeClasses: 0,
    deepNesting: 0,
    highComplexity: 0,
    deprecations: 0
  };

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async analyze(): Promise<DebtAnalysis> {
    console.log('🔍 Starting Technical Debt Analysis...');

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

      // Count TODO/FIXME/HACK comments
      const todoRegex = /\/\/\s*(TODO|FIXME|HACK|XXX)/gi;
      const todos = content.match(todoRegex);
      this.debtItems.todos += todos ? todos.length : 0;

      // Count deprecated API usage
      const deprecatedRegex = /@deprecated|DEPRECATED/gi;
      const deprecated = content.match(deprecatedRegex);
      this.debtItems.deprecations += deprecated ? deprecated.length : 0;

      // Detect code smells
      this.detectCodeSmells(lines);

    } catch (error) {
      // Skip
    }
  }

  private detectCodeSmells(lines: string[]): void {
    let functionStart = -1;
    let braceCount = 0;
    let currentNesting = 0;
    let maxNesting = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect function start
      if (line.match(/function\s+\w+|const\s+\w+\s*=\s*\(/)) {
        functionStart = i;
        maxNesting = 0;
      }

      // Track nesting
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          currentNesting++;
          maxNesting = Math.max(maxNesting, currentNesting);
        } else if (char === '}') {
          braceCount--;
          currentNesting = Math.max(0, currentNesting - 1);

          // Function ended
          if (braceCount === 0 && functionStart !== -1) {
            const functionLength = i - functionStart;

            if (functionLength > 50) {
              this.debtItems.longMethods++;
            }

            if (maxNesting > 3) {
              this.debtItems.deepNesting++;
            }

            functionStart = -1;
          }
        }
      }
    }

    // Detect large files (classes)
    if (lines.length > 500) {
      this.debtItems.largeClasses++;
    }
  }

  private generateReport(): DebtAnalysis {
    // Estimate fix times (in hours)
    const fixTimes = {
      todos: this.debtItems.todos * 0.5, // 30 min each
      longMethods: this.debtItems.longMethods * 1, // 1 hr each
      largeClasses: this.debtItems.largeClasses * 3, // 3 hrs each
      deepNesting: this.debtItems.deepNesting * 0.75, // 45 min each
      deprecations: this.debtItems.deprecations * 2 // 2 hrs each
    };

    const totalFixTime = Object.values(fixTimes).reduce((a, b) => a + b, 0);

    // Estimate development time (rough: 1000 LOC ≈ 2 weeks = 80 hours)
    const sourceFiles = this.findSourceFiles();
    const totalLOC = sourceFiles.reduce((sum, file) => {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        return sum + content.split('\n').length;
      } catch {
        return sum;
      }
    }, 0);

    const estimatedDevTime = Math.round((totalLOC / 1000) * 80);
    const debtRatio = estimatedDevTime > 0
      ? Math.round((totalFixTime / estimatedDevTime) * 100)
      : 0;

    const quickWins = this.identifyQuickWins();
    const payoffRoadmap = this.createPayoffRoadmap();
    const roiAnalysis = this.generateROI();

    return {
      totalDebtRatio: debtRatio,
      estimatedFixTime: Math.round(totalFixTime),
      estimatedDevTime,
      debtBreakdown: {
        codeSmells: Math.round(fixTimes.longMethods + fixTimes.largeClasses + fixTimes.deepNesting),
        todoItems: Math.round(fixTimes.todos),
        deprecatedAPIs: Math.round(fixTimes.deprecations),
        securityIssues: 0
      },
      quickWins,
      payoffRoadmap,
      roiAnalysis
    };
  }

  private identifyQuickWins(): Array<{ description: string; effort: string; impact: string }> {
    const wins: Array<any> = [];

    if (this.debtItems.todos > 10) {
      wins.push({
        description: `Resolve ${this.debtItems.todos} TODO comments`,
        effort: '<1hr each',
        impact: 'High - removes uncertainty and documents decisions'
      });
    }

    if (this.debtItems.deepNesting > 5) {
      wins.push({
        description: 'Refactor deeply nested functions with early returns',
        effort: '<1hr each',
        impact: 'High - improves readability'
      });
    }

    if (wins.length === 0) {
      wins.push({
        description: 'No immediate quick wins identified',
        effort: 'N/A',
        impact: 'Technical debt is well-managed'
      });
    }

    return wins;
  }

  private createPayoffRoadmap(): any {
    const roadmap = {
      sprint30Days: [] as string[],
      sprint60Days: [] as string[],
      sprint90Days: [] as string[]
    };

    // 30 days: Quick wins
    if (this.debtItems.todos > 0) {
      roadmap.sprint30Days.push('Resolve all TODO/FIXME comments');
    }
    if (this.debtItems.deepNesting > 0) {
      roadmap.sprint30Days.push('Refactor deeply nested functions');
    }

    // 60 days: Medium effort
    if (this.debtItems.longMethods > 0) {
      roadmap.sprint60Days.push(`Break down ${this.debtItems.longMethods} long methods`);
    }
    if (this.debtItems.deprecations > 0) {
      roadmap.sprint60Days.push('Upgrade deprecated API usage');
    }

    // 90 days: Large refactoring
    if (this.debtItems.largeClasses > 0) {
      roadmap.sprint90Days.push(`Refactor ${this.debtItems.largeClasses} large classes`);
    }
    roadmap.sprint90Days.push('Architectural review and improvements');

    return roadmap;
  }

  private generateROI(): string[] {
    return [
      'Reduced bug rate by improving code quality',
      'Faster feature development with cleaner codebase',
      'Easier onboarding for new developers',
      'Lower maintenance costs long-term'
    ];
  }

  async saveReport(analysis: DebtAnalysis): Promise<void> {
    const reportPath = path.join(this.rootDir, 'analysis', 'ANALYSIS_REPORT.md');
    let reportContent = fs.readFileSync(reportPath, 'utf-8');

    const section = this.formatReportSection(analysis);

    reportContent = reportContent.replace(
      /## Technical Debt Analysis\n\n[\s\S]*?(?=\n---\n\n## |$)/,
      `## Technical Debt Analysis\n\n${section}\n`
    );

    fs.writeFileSync(reportPath, reportContent, 'utf-8');
    console.log('✅ Debt analysis saved to ANALYSIS_REPORT.md');

    const dataPath = path.join(this.rootDir, 'analysis', 'data', 'debt-raw.json');
    fs.writeFileSync(dataPath, JSON.stringify({ analysis, debtItems: this.debtItems, timestamp: new Date().toISOString() }, null, 2));
  }

  private formatReportSection(analysis: DebtAnalysis): string {
    let output = `**Total Debt Ratio:** ${analysis.totalDebtRatio}%\n\n`;

    output += `### Key Metrics\n\n`;
    output += `- **Estimated Fix Time:** ${analysis.estimatedFixTime} hours\n`;
    output += `- **Estimated Development Time:** ${analysis.estimatedDevTime} hours\n`;
    output += `- **Debt Ratio:** ${analysis.totalDebtRatio}% (fix time / dev time)\n\n`;

    const rating = analysis.totalDebtRatio < 5 ? '✅ Excellent' :
                   analysis.totalDebtRatio < 10 ? '✅ Good' :
                   analysis.totalDebtRatio < 20 ? '⚠️  Moderate' : '❌ High';

    output += `**Debt Rating:** ${rating}\n\n`;

    output += `### Debt Breakdown by Category\n\n`;
    output += `- **Code Smells:** ${analysis.debtBreakdown.codeSmells} hours\n`;
    output += `- **TODO Items:** ${analysis.debtBreakdown.todoItems} hours\n`;
    output += `- **Deprecated APIs:** ${analysis.debtBreakdown.deprecatedAPIs} hours\n`;
    output += `- **Security Issues:** ${analysis.debtBreakdown.securityIssues} hours\n\n`;

    output += `### Quick Wins (<1hr fixes with high impact)\n\n`;
    for (const win of analysis.quickWins) {
      output += `**${win.description}**\n`;
      output += `- Effort: ${win.effort}\n`;
      output += `- Impact: ${win.impact}\n\n`;
    }

    output += `### Debt Payoff Roadmap\n\n`;
    output += `#### 30-Day Sprint\n`;
    for (const item of analysis.payoffRoadmap.sprint30Days) {
      output += `- ${item}\n`;
    }
    output += `\n`;

    output += `#### 60-Day Sprint\n`;
    for (const item of analysis.payoffRoadmap.sprint60Days) {
      output += `- ${item}\n`;
    }
    output += `\n`;

    output += `#### 90-Day Sprint\n`;
    for (const item of analysis.payoffRoadmap.sprint90Days) {
      output += `- ${item}\n`;
    }
    output += `\n`;

    output += `### ROI Analysis\n\n`;
    for (const roi of analysis.roiAnalysis) {
      output += `- ${roi}\n`;
    }
    output += `\n`;

    output += `---\n`;

    return output;
  }
}

async function main() {
  const startTime = Date.now();
  console.log('🚀 Technical Debt Accountant Starting...\n');

  const rootDir = path.resolve(__dirname, '../..');
  const accountant = new DebtAccountant(rootDir);

  try {
    const analysis = await accountant.analyze();
    await accountant.saveReport(analysis);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ Analysis complete in ${duration}s`);
    console.log(`📊 Debt Ratio: ${analysis.totalDebtRatio}%`);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { DebtAccountant, DebtAnalysis };
