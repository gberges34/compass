#!/usr/bin/env ts-node

/**
 * Multi-Agent Orchestrator
 *
 * Coordinates the execution of all 9 analysis agents and generates
 * a consolidated quality assessment report.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface AgentDefinition {
  id: number;
  name: string;
  file: string;
  description: string;
}

const AGENTS: AgentDefinition[] = [
  {
    id: 1,
    name: 'Reliability Analyst',
    file: 'reliability-analyst.ts',
    description: 'Error handling and reliability patterns'
  },
  {
    id: 2,
    name: 'Maintainability Inspector',
    file: 'maintainability-inspector.ts',
    description: 'Code readability and maintainability'
  },
  {
    id: 3,
    name: 'Cyclomatic Complexity Auditor',
    file: 'complexity-auditor.ts',
    description: 'Control flow complexity analysis'
  },
  {
    id: 4,
    name: 'Code Churn Tracker',
    file: 'churn-tracker.ts',
    description: 'Change frequency and stability'
  },
  {
    id: 5,
    name: 'Duplication Detective',
    file: 'duplication-detective.ts',
    description: 'Code duplication detection'
  },
  {
    id: 6,
    name: 'Test Coverage Analyst',
    file: 'coverage-analyst.ts',
    description: 'Test coverage measurement'
  },
  {
    id: 7,
    name: 'Technical Debt Accountant',
    file: 'debt-accountant.ts',
    description: 'Technical debt calculation'
  },
  {
    id: 8,
    name: 'Sustainability Metrics Evaluator',
    file: 'sustainability-evaluator.ts',
    description: 'Resource efficiency analysis'
  },
  {
    id: 9,
    name: 'Review Metrics Analyst',
    file: 'review-metrics-analyst.ts',
    description: 'Code review process health'
  }
];

class Orchestrator {
  private rootDir: string;
  private agentsDir: string;
  private results: Map<number, { success: boolean; duration: number; error?: string }> = new Map();

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.agentsDir = path.join(rootDir, 'analysis', 'agents');
  }

  async runAllAgents(options: { parallel?: boolean; skipErrors?: boolean } = {}): Promise<void> {
    console.log('🚀 Multi-Agent Repository Quality Assessment\n');
    console.log('═'.repeat(60));
    console.log(`Repository: ${this.rootDir}`);
    console.log(`Agents: ${AGENTS.length}`);
    console.log(`Mode: ${options.parallel ? 'Parallel' : 'Sequential'}`);
    console.log('═'.repeat(60));
    console.log('');

    const startTime = Date.now();

    if (options.parallel) {
      await this.runParallel(options.skipErrors || false);
    } else {
      await this.runSequential(options.skipErrors || false);
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(60));
    console.log('📊 ANALYSIS SUMMARY');
    console.log('═'.repeat(60));

    const successful = Array.from(this.results.values()).filter(r => r.success).length;
    const failed = AGENTS.length - successful;

    console.log(`✅ Successful: ${successful}/${AGENTS.length}`);
    if (failed > 0) {
      console.log(`❌ Failed: ${failed}`);
    }
    console.log(`⏱️  Total Duration: ${totalDuration}s`);

    // Show individual agent results
    console.log('\nAgent Results:');
    for (const agent of AGENTS) {
      const result = this.results.get(agent.id);
      if (result) {
        const status = result.success ? '✅' : '❌';
        const duration = result.duration.toFixed(2);
        console.log(`  ${status} Agent ${agent.id}: ${agent.name} (${duration}s)`);
        if (result.error) {
          console.log(`     Error: ${result.error}`);
        }
      }
    }

    console.log('');

    if (successful > 0) {
      await this.generateExecutiveSummary();
      console.log('\n📝 Full report available at: analysis/ANALYSIS_REPORT.md');
    }
  }

  private async runSequential(skipErrors: boolean): Promise<void> {
    for (const agent of AGENTS) {
      await this.runAgent(agent, skipErrors);
    }
  }

  private async runParallel(skipErrors: boolean): Promise<void> {
    const promises = AGENTS.map(agent => this.runAgent(agent, skipErrors));
    await Promise.allSettled(promises);
  }

  private async runAgent(agent: AgentDefinition, skipErrors: boolean): Promise<void> {
    console.log(`\n📍 Running Agent ${agent.id}: ${agent.name}`);
    console.log(`   ${agent.description}`);

    // Update agent status
    this.updateAgentStatus(agent.id, 'Running');

    const startTime = Date.now();

    try {
      const agentPath = path.join(this.agentsDir, agent.file);

      // Check if ts-node is available, otherwise compile first
      let command: string;
      try {
        execSync('which ts-node', { stdio: 'pipe' });
        command = `ts-node "${agentPath}"`;
      } catch {
        // ts-node not available, try npx
        command = `npx ts-node "${agentPath}"`;
      }

      const output = execSync(command, {
        cwd: this.rootDir,
        encoding: 'utf-8',
        stdio: 'pipe',
        maxBuffer: 50 * 1024 * 1024
      });

      const duration = (Date.now() - startTime) / 1000;
      this.results.set(agent.id, { success: true, duration });

      console.log(`   ✅ Completed in ${duration.toFixed(2)}s`);

      this.updateAgentStatus(agent.id, 'Completed', duration);

    } catch (error: any) {
      const duration = (Date.now() - startTime) / 1000;
      const errorMessage = error.message || 'Unknown error';

      this.results.set(agent.id, { success: false, duration, error: errorMessage });

      console.log(`   ❌ Failed after ${duration.toFixed(2)}s`);
      console.log(`   Error: ${errorMessage.substring(0, 200)}`);

      this.updateAgentStatus(agent.id, 'Failed', duration);

      if (!skipErrors) {
        throw new Error(`Agent ${agent.id} (${agent.name}) failed: ${errorMessage}`);
      }
    }
  }

  private updateAgentStatus(agentId: number, status: string, duration?: number): void {
    const statusPath = path.join(this.rootDir, 'analysis', 'AGENT_STATUS.md');

    try {
      let content = fs.readFileSync(statusPath, 'utf-8');
      const agent = AGENTS.find(a => a.id === agentId);

      if (agent) {
        const now = new Date().toISOString();
        const durationStr = duration ? `${duration.toFixed(2)}s` : '-';

        // Find and update the agent's row
        const regex = new RegExp(`\\| ${agentId} \\| [^|]+ \\| [^|]+ \\| [^|]+ \\| [^|]+ \\| [^|]+ \\| [^|]+ \\|`);

        const endTime = status === 'Completed' || status === 'Failed' ? now : '-';

        const newRow = `| ${agentId} | ${agent.name} | ${status} | ${now} | ${endTime} | ${durationStr} | - |`;

        if (regex.test(content)) {
          content = content.replace(regex, newRow);
        }

        fs.writeFileSync(statusPath, content, 'utf-8');
      }
    } catch (error) {
      console.warn('Could not update agent status:', error);
    }
  }

  private async generateExecutiveSummary(): Promise<void> {
    console.log('\n📊 Generating Executive Summary...');

    const reportPath = path.join(this.rootDir, 'analysis', 'ANALYSIS_REPORT.md');
    let reportContent = fs.readFileSync(reportPath, 'utf-8');

    // Load all analysis results
    const dataDir = path.join(this.rootDir, 'analysis', 'data');
    const scores: any = {};

    try {
      // Extract scores from analysis files
      const reliabilityData = this.loadJSON(path.join(dataDir, 'reliability-raw.json'));
      if (reliabilityData) scores.reliability = reliabilityData.analysis.overallScore;

      const maintainabilityData = this.loadJSON(path.join(dataDir, 'maintainability-raw.json'));
      if (maintainabilityData) scores.maintainability = maintainabilityData.analysis.maintainabilityIndex;

      const complexityData = this.loadJSON(path.join(dataDir, 'complexity-raw.json'));
      if (complexityData) {
        // Convert avg complexity to 0-100 scale (inverse: lower is better)
        const avgComplexity = complexityData.analysis.averageComplexity;
        scores.complexity = Math.max(0, 100 - (avgComplexity * 5));
      }

      const churnData = this.loadJSON(path.join(dataDir, 'churn-raw.json'));
      if (churnData) {
        // Calculate score based on stability
        const total = churnData.analysis.stabilityRatings.stable +
                     churnData.analysis.stabilityRatings.moderate +
                     churnData.analysis.stabilityRatings.unstable;
        const stablePercent = total > 0 ? (churnData.analysis.stabilityRatings.stable / total) * 100 : 100;
        scores.churn = Math.round(stablePercent);
      }

      const duplicationData = this.loadJSON(path.join(dataDir, 'duplication-raw.json'));
      if (duplicationData) {
        scores.duplication = Math.max(0, 100 - duplicationData.analysis.overallDuplicationRate * 2);
      }

      const coverageData = this.loadJSON(path.join(dataDir, 'coverage-raw.json'));
      if (coverageData) scores.coverage = coverageData.analysis.overallCoverage;

      const debtData = this.loadJSON(path.join(dataDir, 'debt-raw.json'));
      if (debtData) {
        scores.debt = Math.max(0, 100 - debtData.analysis.totalDebtRatio);
      }

      const sustainabilityData = this.loadJSON(path.join(dataDir, 'sustainability-raw.json'));
      if (sustainabilityData) {
        scores.sustainability = (sustainabilityData.analysis.algorithmicEfficiency +
                                sustainabilityData.analysis.memoryOptimization) / 2;
      }

      // Calculate overall quality score
      const allScores = Object.values(scores).filter((s): s is number => typeof s === 'number');
      const overallScore = allScores.length > 0
        ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length)
        : 0;

      // Generate executive summary
      const summary = this.formatExecutiveSummary(overallScore, scores);

      // Update the report
      reportContent = reportContent.replace(
        /## Executive Summary\n\n[\s\S]*?(?=\n---\n\n## |$)/,
        `## Executive Summary\n\n${summary}\n`
      );

      reportContent = reportContent.replace(
        /## Overall Quality Score\n\n[\s\S]*?(?=\n---\n\n## |$)/,
        `## Overall Quality Score\n\n**${overallScore}/100**\n\n${this.formatScoreBreakdown(scores)}\n`
      );

      fs.writeFileSync(reportPath, reportContent, 'utf-8');

      console.log(`✅ Executive summary generated (Overall Score: ${overallScore}/100)`);

    } catch (error) {
      console.warn('Could not generate complete executive summary:', error);
    }
  }

  private loadJSON(filePath: string): any {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch {
      // Return null if file doesn't exist or can't be parsed
    }
    return null;
  }

  private formatExecutiveSummary(overallScore: number, scores: any): string {
    let output = `**Overall Quality Score: ${overallScore}/100**\n\n`;

    const rating = overallScore >= 80 ? '🟢 Excellent' :
                   overallScore >= 60 ? '🟡 Good' :
                   overallScore >= 40 ? '🟠 Fair' : '🔴 Needs Improvement';

    output += `**Rating:** ${rating}\n\n`;

    output += `This comprehensive analysis evaluated ${Object.keys(scores).length} key quality dimensions across the codebase. `;

    // Identify strengths and weaknesses
    const sortedScores = Object.entries(scores)
      .filter(([_, score]) => typeof score === 'number')
      .sort((a: any, b: any) => b[1] - a[1]);

    if (sortedScores.length > 0) {
      const strongest = sortedScores[0];
      const weakest = sortedScores[sortedScores.length - 1];

      output += `The codebase shows particular strength in ${strongest[0]} (${strongest[1]}/100), `;
      output += `while ${weakest[0]} (${weakest[1]}/100) presents the greatest opportunity for improvement.\n\n`;
    }

    output += `### Key Findings\n\n`;

    // Highlight critical items
    if (scores.reliability < 70) {
      output += `- ⚠️  **Reliability concerns** detected - prioritize error handling improvements\n`;
    }
    if (scores.coverage < 60) {
      output += `- ⚠️  **Test coverage** below target - expand test suite\n`;
    }
    if (scores.debt > 80) {
      output += `- ✅ **Technical debt** well-managed\n`;
    } else if (scores.debt < 60) {
      output += `- ⚠️  **Technical debt** accumulating - implement payoff roadmap\n`;
    }

    output += `\n### Recommended Actions\n\n`;
    output += `Based on the analysis, the following actions are recommended in priority order:\n\n`;

    // Generate prioritized recommendations
    const recommendations: Array<{ priority: number; action: string }> = [];

    if (scores.reliability < 70) {
      recommendations.push({ priority: 1, action: 'Improve error handling and input validation' });
    }
    if (scores.coverage < 60) {
      recommendations.push({ priority: 1, action: 'Increase test coverage to minimum 80%' });
    }
    if (scores.complexity < 70) {
      recommendations.push({ priority: 2, action: 'Refactor high-complexity functions' });
    }
    if (scores.duplication < 70) {
      recommendations.push({ priority: 2, action: 'Extract duplicate code into reusable utilities' });
    }
    if (scores.maintainability < 70) {
      recommendations.push({ priority: 3, action: 'Improve code documentation and naming conventions' });
    }

    if (recommendations.length === 0) {
      output += `1. Continue maintaining current quality standards\n`;
      output += `2. Focus on preventing quality regression\n`;
      output += `3. Document best practices for team\n`;
    } else {
      recommendations.sort((a, b) => a.priority - b.priority);
      for (let i = 0; i < recommendations.length; i++) {
        output += `${i + 1}. ${recommendations[i].action}\n`;
      }
    }

    output += `\n---\n`;

    return output;
  }

  private formatScoreBreakdown(scores: any): string {
    let output = `### Score Breakdown\n\n`;

    const scoreNames: any = {
      reliability: 'Reliability',
      maintainability: 'Maintainability',
      complexity: 'Cyclomatic Complexity',
      churn: 'Code Stability',
      duplication: 'DRY Compliance',
      coverage: 'Test Coverage',
      debt: 'Technical Debt',
      sustainability: 'Resource Efficiency'
    };

    output += `| Dimension | Score | Rating |\n`;
    output += `|-----------|-------|--------|\n`;

    for (const [key, score] of Object.entries(scores)) {
      if (typeof score === 'number') {
        const rating = score >= 80 ? '🟢 Excellent' :
                      score >= 60 ? '🟡 Good' :
                      score >= 40 ? '🟠 Fair' : '🔴 Poor';

        output += `| ${scoreNames[key] || key} | ${score}/100 | ${rating} |\n`;
      }
    }

    output += `\n---\n`;

    return output;
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const parallel = args.includes('--parallel') || args.includes('-p');
  const skipErrors = args.includes('--skip-errors') || args.includes('-s');

  const rootDir = path.resolve(__dirname, '..');
  const orchestrator = new Orchestrator(rootDir);

  try {
    await orchestrator.runAllAgents({ parallel, skipErrors });
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Orchestration failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { Orchestrator };
