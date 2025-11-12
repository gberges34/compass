#!/usr/bin/env ts-node

/**
 * Agent 6: Test Coverage Analyst
 *
 * Measures test coverage and identifies untested critical paths.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface CoverageAnalysis {
  overallCoverage: number;
  statementCoverage: number;
  branchCoverage: number;
  functionCoverage: number;
  testToSourceRatio: number;
  criticalUnt

estedAreas: string[];
  coverageGaps: Array<{ file: string; coverage: number }>;
  recommendations: string[];
}

class CoverageAnalyst {
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async analyze(): Promise<CoverageAnalysis> {
    console.log('🔍 Starting Test Coverage Analysis...');

    const testFiles = this.findTestFiles();
    const sourceFiles = this.findSourceFiles();

    const testToSourceRatio = sourceFiles.length > 0
      ? Math.round((testFiles.length / sourceFiles.length) * 100)
      : 0;

    // Try to find existing coverage data
    const coverageData = this.loadCoverageData();

    // Identify critical untested areas
    const criticalUntested = this.identifyCriticalUntested(sourceFiles, testFiles);

    // Generate coverage gaps
    const coverageGaps = this.identifyCoverageGaps(sourceFiles, testFiles);

    const recommendations = this.generateRecommendations(
      testToSourceRatio,
      criticalUntested.length,
      coverageData
    );

    return {
      overallCoverage: coverageData.overall,
      statementCoverage: coverageData.statement,
      branchCoverage: coverageData.branch,
      functionCoverage: coverageData.function,
      testToSourceRatio,
      criticalUntestedAreas,
      coverageGaps,
      recommendations
    };
  }

  private findTestFiles(): string[] {
    return this.findFiles(['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx', '.test.js', '.spec.js']);
  }

  private findSourceFiles(): string[] {
    const allFiles = this.findFiles(['.ts', '.tsx', '.js', '.jsx']);
    return allFiles.filter(f => !f.includes('.test.') && !f.includes('.spec.'));
  }

  private findFiles(extensions: string[]): string[] {
    const excludeDirs = ['node_modules', 'dist', 'build', '.git', 'coverage'];

    const findInDir = (dir: string): string[] => {
      let results: string[] = [];

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            if (!excludeDirs.includes(entry.name)) {
              results = results.concat(findInDir(fullPath));
            }
          } else if (entry.isFile()) {
            if (extensions.some(ext => entry.name.endsWith(ext))) {
              results.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip
      }

      return results;
    };

    return findInDir(this.rootDir);
  }

  private loadCoverageData(): any {
    // Try to find coverage-summary.json
    const coveragePaths = [
      path.join(this.rootDir, 'coverage', 'coverage-summary.json'),
      path.join(this.rootDir, 'frontend', 'coverage', 'coverage-summary.json'),
      path.join(this.rootDir, 'backend', 'coverage', 'coverage-summary.json')
    ];

    for (const coveragePath of coveragePaths) {
      if (fs.existsSync(coveragePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
          const total = data.total;

          if (total) {
            return {
              overall: Math.round(total.statements?.pct || 0),
              statement: Math.round(total.statements?.pct || 0),
              branch: Math.round(total.branches?.pct || 0),
              function: Math.round(total.functions?.pct || 0)
            };
          }
        } catch {
          // Skip invalid files
        }
      }
    }

    // No coverage data found - return estimated/defaults
    return {
      overall: 0,
      statement: 0,
      branch: 0,
      function: 0
    };
  }

  private identifyCriticalUntested(sourceFiles: string[], testFiles: string[]): string[] {
    const critical: string[] = [];

    // Look for API routes, services, and core logic without tests
    const criticalPatterns = ['/routes/', '/services/', '/api/', '/controllers/'];

    for (const file of sourceFiles) {
      const relPath = path.relative(this.rootDir, file);

      // Check if it's a critical file
      const isCritical = criticalPatterns.some(pattern => relPath.includes(pattern));

      if (isCritical) {
        // Check if there's a corresponding test file
        const baseName = path.basename(file, path.extname(file));
        const hasTest = testFiles.some(testFile => testFile.includes(baseName));

        if (!hasTest) {
          critical.push(relPath);
        }
      }
    }

    return critical.slice(0, 10);
  }

  private identifyCoverageGaps(sourceFiles: string[], testFiles: string[]): Array<{ file: string; coverage: number }> {
    const gaps: Array<{ file: string; coverage: number }> = [];

    // Simple heuristic: files without tests have 0% coverage
    for (const file of sourceFiles.slice(0, 20)) {
      const relPath = path.relative(this.rootDir, file);
      const baseName = path.basename(file, path.extname(file));
      const hasTest = testFiles.some(testFile => testFile.includes(baseName));

      if (!hasTest) {
        gaps.push({ file: relPath, coverage: 0 });
      }
    }

    return gaps;
  }

  private generateRecommendations(ratio: number, criticalCount: number, coverage: any): string[] {
    const recs: string[] = [];

    if (coverage.overall < 80) {
      recs.push(`Increase overall test coverage from ${coverage.overall}% to target of 80%`);
    }

    if (criticalCount > 0) {
      recs.push(`Add tests for ${criticalCount} critical untested files (API routes, services)`);
    }

    if (ratio < 50) {
      recs.push('Low test-to-source ratio - aim for at least 1 test file per 2 source files');
    }

    if (coverage.branch < coverage.statement) {
      recs.push('Improve branch coverage by testing error paths and edge cases');
    }

    recs.push('Focus on testing business logic and public APIs first');
    recs.push('Consider integration tests for critical user flows');

    return recs.slice(0, 6);
  }

  async saveReport(analysis: CoverageAnalysis): Promise<void> {
    const reportPath = path.join(this.rootDir, 'analysis', 'ANALYSIS_REPORT.md');
    let reportContent = fs.readFileSync(reportPath, 'utf-8');

    const section = this.formatReportSection(analysis);

    reportContent = reportContent.replace(
      /## Test Coverage Analysis\n\n[\s\S]*?(?=\n---\n\n## |$)/,
      `## Test Coverage Analysis\n\n${section}\n`
    );

    fs.writeFileSync(reportPath, reportContent, 'utf-8');
    console.log('✅ Coverage analysis saved to ANALYSIS_REPORT.md');

    const dataPath = path.join(this.rootDir, 'analysis', 'data', 'coverage-raw.json');
    fs.writeFileSync(dataPath, JSON.stringify({ analysis, timestamp: new Date().toISOString() }, null, 2));
  }

  private formatReportSection(analysis: CoverageAnalysis): string {
    let output = `**Overall Coverage Score:** ${analysis.overallCoverage}%\n\n`;

    output += `### Coverage Metrics\n\n`;
    output += `- **Statement Coverage:** ${analysis.statementCoverage}%\n`;
    output += `- **Branch Coverage:** ${analysis.branchCoverage}%\n`;
    output += `- **Function Coverage:** ${analysis.functionCoverage}%\n`;
    output += `- **Test-to-Source Ratio:** ${analysis.testToSourceRatio}%\n\n`;

    const targetMet = analysis.overallCoverage >= 80;
    output += targetMet
      ? `✅ Coverage meets industry standard (80%)\n\n`
      : `⚠️  Coverage below target - aim for 80% minimum\n\n`;

    output += `### Critical Untested Areas\n\n`;
    if (analysis.criticalUntestedAreas.length === 0) {
      output += `✅ All critical files have test coverage!\n\n`;
    } else {
      output += `The following critical files lack test coverage:\n\n`;
      for (const file of analysis.criticalUntestedAreas) {
        output += `- ${file}\n`;
      }
      output += `\n`;
    }

    output += `### Coverage Gaps (Sample)\n\n`;
    if (analysis.coverageGaps.length === 0) {
      output += `✅ No significant coverage gaps detected\n\n`;
    } else {
      for (const gap of analysis.coverageGaps.slice(0, 10)) {
        output += `- ${gap.file} - ${gap.coverage}% coverage\n`;
      }
      output += `\n`;
    }

    output += `### Testing Recommendations\n\n`;
    for (let i = 0; i < analysis.recommendations.length; i++) {
      output += `${i + 1}. ${analysis.recommendations[i]}\n`;
    }
    output += `\n`;

    output += `### Comparison to Industry Standard\n\n`;
    output += `- **Target Coverage:** 80% (minimum for production code)\n`;
    output += `- **Current Coverage:** ${analysis.overallCoverage}%\n`;
    output += `- **Gap:** ${Math.max(0, 80 - analysis.overallCoverage)}%\n\n`;

    output += `---\n`;

    return output;
  }
}

async function main() {
  const startTime = Date.now();
  console.log('🚀 Test Coverage Analyst Starting...\n');

  const rootDir = path.resolve(__dirname, '../..');
  const analyst = new CoverageAnalyst(rootDir);

  try {
    const analysis = await analyst.analyze();
    await analyst.saveReport(analysis);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ Analysis complete in ${duration}s`);
    console.log(`📊 Overall Coverage: ${analysis.overallCoverage}%`);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { CoverageAnalyst, CoverageAnalysis };
