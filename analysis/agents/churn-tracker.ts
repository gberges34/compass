#!/usr/bin/env ts-node

/**
 * Agent 4: Code Churn Tracker
 *
 * Analyzes git commit history to track code change frequency,
 * identify unstable areas, and correlate with bug fixes.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface FileChurn {
  file: string;
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  churnScore: number;
  stability: 'stable' | 'moderate' | 'unstable';
  authors: Set<string>;
  bugFixCommits: number;
}

interface ChurnAnalysis {
  totalCommits: number;
  analysisWindow: string;
  topChurnFiles: Array<{
    file: string;
    commits: number;
    churnScore: number;
    linesChanged: number;
    stability: string;
  }>;
  stabilityRatings: {
    stable: number;
    moderate: number;
    unstable: number;
  };
  bugFixCorrelation: Array<{
    file: string;
    totalCommits: number;
    bugFixCommits: number;
    bugFixRate: number;
  }>;
  authorConcentration: {
    singleAuthor: number;
    teamOwned: number;
  };
  riskAssessment: string[];
}

class ChurnTracker {
  private rootDir: string;
  private fileChurnMap: Map<string, FileChurn> = new Map();

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async analyze(): Promise<ChurnAnalysis> {
    console.log('🔍 Starting Code Churn Analysis...');

    // Check if we're in a git repository
    try {
      execSync('git rev-parse --git-dir', { cwd: this.rootDir, stdio: 'pipe' });
    } catch {
      throw new Error('Not a git repository');
    }

    // Get commit history for the last 90 days
    const commitHistory = this.getCommitHistory();
    console.log(`📊 Found ${commitHistory.length} commits in the last 90 days`);

    this.processCommitHistory(commitHistory);

    return this.generateReport();
  }

  private getCommitHistory(): Array<{
    hash: string;
    author: string;
    date: string;
    message: string;
    files: Array<{ file: string; added: number; deleted: number }>;
  }> {
    try {
      // Get commit log with numstat
      const output = execSync(
        'git log --since="90 days ago" --numstat --pretty=format:"COMMIT|%H|%an|%ad|%s" --date=short',
        { cwd: this.rootDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      const commits: Array<any> = [];
      const lines = output.split('\n');
      let currentCommit: any = null;

      for (const line of lines) {
        if (line.startsWith('COMMIT|')) {
          // Save previous commit if exists
          if (currentCommit) {
            commits.push(currentCommit);
          }

          // Parse new commit
          const parts = line.substring(7).split('|');
          currentCommit = {
            hash: parts[0],
            author: parts[1],
            date: parts[2],
            message: parts[3] || '',
            files: []
          };
        } else if (line.trim() && currentCommit && line.includes('\t')) {
          // Parse file change statistics
          const parts = line.split('\t');
          if (parts.length >= 3) {
            const added = parseInt(parts[0]) || 0;
            const deleted = parseInt(parts[1]) || 0;
            const file = parts[2];

            // Skip binary files and certain paths
            if (!file.includes('node_modules') && !file.includes('.lock')) {
              currentCommit.files.push({ file, added, deleted });
            }
          }
        }
      }

      // Don't forget the last commit
      if (currentCommit) {
        commits.push(currentCommit);
      }

      return commits;
    } catch (error) {
      console.error('Error getting git history:', error);
      return [];
    }
  }

  private processCommitHistory(commits: Array<any>): void {
    for (const commit of commits) {
      const isBugFix = this.isBugFixCommit(commit.message);

      for (const fileChange of commit.files) {
        let churn = this.fileChurnMap.get(fileChange.file);

        if (!churn) {
          churn = {
            file: fileChange.file,
            commits: 0,
            linesAdded: 0,
            linesDeleted: 0,
            churnScore: 0,
            stability: 'stable',
            authors: new Set(),
            bugFixCommits: 0
          };
          this.fileChurnMap.set(fileChange.file, churn);
        }

        churn.commits++;
        churn.linesAdded += fileChange.added;
        churn.linesDeleted += fileChange.deleted;
        churn.authors.add(commit.author);

        if (isBugFix) {
          churn.bugFixCommits++;
        }
      }
    }

    // Calculate churn scores and stability ratings
    for (const churn of this.fileChurnMap.values()) {
      // Churn score = (additions + deletions) / number of commits
      churn.churnScore = churn.commits > 0
        ? Math.round((churn.linesAdded + churn.linesDeleted) / churn.commits)
        : 0;

      // Stability rating
      if (churn.commits > 20 || churn.churnScore > 100) {
        churn.stability = 'unstable';
      } else if (churn.commits > 10 || churn.churnScore > 50) {
        churn.stability = 'moderate';
      } else {
        churn.stability = 'stable';
      }
    }
  }

  private isBugFixCommit(message: string): boolean {
    const bugKeywords = ['fix', 'bug', 'issue', 'defect', 'error', 'crash', 'patch'];
    const lowerMessage = message.toLowerCase();
    return bugKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private generateReport(): ChurnAnalysis {
    const churns = Array.from(this.fileChurnMap.values());

    // Top 10 highest churn files
    const topChurnFiles = churns
      .sort((a, b) => b.churnScore - a.churnScore)
      .slice(0, 10)
      .map(c => ({
        file: c.file,
        commits: c.commits,
        churnScore: c.churnScore,
        linesChanged: c.linesAdded + c.linesDeleted,
        stability: c.stability
      }));

    // Stability ratings
    const stabilityRatings = {
      stable: churns.filter(c => c.stability === 'stable').length,
      moderate: churns.filter(c => c.stability === 'moderate').length,
      unstable: churns.filter(c => c.stability === 'unstable').length
    };

    // Bug fix correlation
    const bugFixCorrelation = churns
      .filter(c => c.bugFixCommits > 0)
      .sort((a, b) => (b.bugFixCommits / b.commits) - (a.bugFixCommits / a.commits))
      .slice(0, 10)
      .map(c => ({
        file: c.file,
        totalCommits: c.commits,
        bugFixCommits: c.bugFixCommits,
        bugFixRate: Math.round((c.bugFixCommits / c.commits) * 100)
      }));

    // Author concentration
    const authorConcentration = {
      singleAuthor: churns.filter(c => c.authors.size === 1).length,
      teamOwned: churns.filter(c => c.authors.size > 1).length
    };

    // Risk assessment
    const riskAssessment = this.assessRisks(churns);

    // Calculate total commits
    const totalCommits = new Set(
      Array.from(this.fileChurnMap.values()).flatMap(() => [])
    ).size;

    // Count unique commits properly
    let uniqueCommits = 0;
    try {
      const output = execSync('git log --since="90 days ago" --oneline', {
        cwd: this.rootDir,
        encoding: 'utf-8'
      });
      uniqueCommits = output.trim().split('\n').length;
    } catch {
      uniqueCommits = Math.max(...churns.map(c => c.commits));
    }

    return {
      totalCommits: uniqueCommits,
      analysisWindow: '90 days',
      topChurnFiles,
      stabilityRatings,
      bugFixCorrelation,
      authorConcentration,
      riskAssessment
    };
  }

  private assessRisks(churns: FileChurn[]): string[] {
    const risks: string[] = [];

    const unstableCount = churns.filter(c => c.stability === 'unstable').length;
    if (unstableCount > 10) {
      risks.push(`${unstableCount} files are highly unstable - prioritize refactoring and testing`);
    }

    const highChurnFiles = churns.filter(c => c.commits > 30);
    if (highChurnFiles.length > 0) {
      risks.push(`${highChurnFiles.length} files have >30 commits in 90 days - may indicate design issues`);
    }

    const highBugFixRate = churns.filter(c => c.bugFixCommits / c.commits > 0.5 && c.commits > 5);
    if (highBugFixRate.length > 0) {
      risks.push(`${highBugFixRate.length} files have >50% bug-fix commits - quality issues detected`);
    }

    const singleAuthorCritical = churns.filter(c =>
      c.authors.size === 1 && c.commits > 20
    );
    if (singleAuthorCritical.length > 0) {
      risks.push(`${singleAuthorCritical.length} high-churn files owned by single author - bus factor risk`);
    }

    if (risks.length === 0) {
      risks.push('No critical churn-related risks detected');
    }

    return risks;
  }

  async saveReport(analysis: ChurnAnalysis): Promise<void> {
    const reportPath = path.join(this.rootDir, 'analysis', 'ANALYSIS_REPORT.md');
    let reportContent = fs.readFileSync(reportPath, 'utf-8');

    const section = this.formatReportSection(analysis);

    reportContent = reportContent.replace(
      /## Code Churn Analysis\n\n[\s\S]*?(?=\n---\n\n## |$)/,
      `## Code Churn Analysis\n\n${section}\n`
    );

    fs.writeFileSync(reportPath, reportContent, 'utf-8');
    console.log('✅ Churn analysis saved to ANALYSIS_REPORT.md');

    const dataPath = path.join(this.rootDir, 'analysis', 'data', 'churn-raw.json');
    fs.writeFileSync(dataPath, JSON.stringify({
      analysis,
      fileChurns: Array.from(this.fileChurnMap.entries()).map(([file, churn]) => ({
        file,
        ...churn,
        authors: Array.from(churn.authors)
      })),
      timestamp: new Date().toISOString()
    }, null, 2));
    console.log('✅ Raw data saved to data/churn-raw.json');
  }

  private formatReportSection(analysis: ChurnAnalysis): string {
    let output = `**Total Commits (${analysis.analysisWindow}):** ${analysis.totalCommits}\n\n`;

    output += `### Top 10 Highest Churn Files\n\n`;
    output += `| Rank | File | Commits | Churn Score | Lines Changed | Stability |\n`;
    output += `|------|------|---------|-------------|---------------|----------|\n`;
    for (let i = 0; i < analysis.topChurnFiles.length; i++) {
      const file = analysis.topChurnFiles[i];
      const emoji = file.stability === 'unstable' ? '🔴' :
                   file.stability === 'moderate' ? '🟡' : '🟢';
      output += `| ${i + 1} | ${file.file} | ${file.commits} | ${file.churnScore} | ${file.linesChanged} | ${emoji} ${file.stability} |\n`;
    }
    output += `\n`;

    output += `### Stability Rating Distribution\n\n`;
    const total = analysis.stabilityRatings.stable + analysis.stabilityRatings.moderate + analysis.stabilityRatings.unstable;
    output += `- 🟢 **Stable:** ${analysis.stabilityRatings.stable} files (${Math.round((analysis.stabilityRatings.stable / total) * 100)}%)\n`;
    output += `- 🟡 **Moderate:** ${analysis.stabilityRatings.moderate} files (${Math.round((analysis.stabilityRatings.moderate / total) * 100)}%)\n`;
    output += `- 🔴 **Unstable:** ${analysis.stabilityRatings.unstable} files (${Math.round((analysis.stabilityRatings.unstable / total) * 100)}%)\n\n`;

    output += `### Bug-Fix Correlation (Top 10)\n\n`;
    if (analysis.bugFixCorrelation.length === 0) {
      output += `✅ No files with bug-fix commit patterns detected\n\n`;
    } else {
      output += `Files with highest proportion of bug-fix commits:\n\n`;
      output += `| File | Total Commits | Bug Fixes | Fix Rate |\n`;
      output += `|------|---------------|-----------|----------|\n`;
      for (const file of analysis.bugFixCorrelation) {
        output += `| ${file.file} | ${file.totalCommits} | ${file.bugFixCommits} | ${file.bugFixRate}% |\n`;
      }
      output += `\n`;
    }

    output += `### Author Concentration\n\n`;
    output += `- **Single-Author Files:** ${analysis.authorConcentration.singleAuthor}\n`;
    output += `- **Team-Owned Files:** ${analysis.authorConcentration.teamOwned}\n`;

    const teamOwnedPercent = Math.round(
      (analysis.authorConcentration.teamOwned /
       (analysis.authorConcentration.singleAuthor + analysis.authorConcentration.teamOwned)) * 100
    );
    output += `- **Team Ownership Rate:** ${teamOwnedPercent}%\n\n`;

    if (teamOwnedPercent < 40) {
      output += `⚠️  Low team ownership rate - consider pair programming and knowledge sharing\n\n`;
    } else if (teamOwnedPercent > 60) {
      output += `✅ Good team ownership distribution\n\n`;
    }

    output += `### Risk Assessment\n\n`;
    for (const risk of analysis.riskAssessment) {
      output += `- ${risk}\n`;
    }
    output += `\n`;

    output += `### Recommendations for Stabilization\n\n`;
    output += `1. **High Churn Files** - Add comprehensive tests and increase code review rigor\n`;
    output += `2. **Bug-Prone Files** - Conduct code quality audit and refactor as needed\n`;
    output += `3. **Single-Author Files** - Implement code ownership rotation and pair programming\n`;
    output += `4. **Unstable Core Components** - Consider architectural refactoring to reduce change frequency\n`;
    output += `5. **Documentation** - Ensure high-churn areas have thorough documentation\n\n`;

    output += `### Churn Score Interpretation\n\n`;
    output += `- **Churn Score:** Average lines changed per commit\n`;
    output += `- **Low (<30):** Stable, incremental changes\n`;
    output += `- **Medium (30-100):** Moderate activity, monitor for quality\n`;
    output += `- **High (>100):** High volatility, prioritize stabilization\n`;

    output += `\n---\n`;

    return output;
  }
}

// Main execution
async function main() {
  const startTime = Date.now();
  console.log('🚀 Code Churn Tracker Starting...\n');

  const rootDir = path.resolve(__dirname, '../..');
  const tracker = new ChurnTracker(rootDir);

  try {
    const analysis = await tracker.analyze();
    await tracker.saveReport(analysis);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ Analysis complete in ${duration}s`);
    console.log(`📊 Total Commits: ${analysis.totalCommits}`);
    console.log(`🔴 Unstable Files: ${analysis.stabilityRatings.unstable}`);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ChurnTracker, ChurnAnalysis };
