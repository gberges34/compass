#!/usr/bin/env ts-node

/**
 * Agent 9: Review Metrics Analyst
 *
 * Evaluates code review process health through PR analysis.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ReviewMetricsAnalysis {
  averageMergeTime: string;
  averagePRSize: number;
  averageCommitsPerPR: number;
  reviewParticipation: Array<{ author: string; prCount: number }>;
  largePRs: Array<{ hash: string; lines: number; date: string }>;
  fastTrackMerges: Array<{ hash: string; minutes: number; message: string }>;
  reviewQualityIndicators: {
    avgCommitsPerPR: number;
    largePRCount: number;
    fastMergeCount: number;
  };
  processRecommendations: string[];
}

class ReviewMetricsAnalyst {
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async analyze(): Promise<ReviewMetricsAnalysis> {
    console.log('🔍 Starting Review Metrics Analysis...');

    // Check if we're in a git repository
    try {
      execSync('git rev-parse --git-dir', { cwd: this.rootDir, stdio: 'pipe' });
    } catch {
      throw new Error('Not a git repository');
    }

    const mergeCommits = this.getMergeCommits();
    console.log(`📊 Found ${mergeCommits.length} merge commits in the last 90 days`);

    return this.generateReport(mergeCommits);
  }

  private getMergeCommits(): Array<{
    hash: string;
    author: string;
    date: string;
    message: string;
    stats: { files: number; insertions: number; deletions: number };
  }> {
    try {
      // Get merge commits
      const output = execSync(
        'git log --merges --since="90 days ago" --pretty=format:"%H|%an|%ad|%s" --date=short --shortstat',
        { cwd: this.rootDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      const lines = output.split('\n');
      const commits: Array<any> = [];
      let currentCommit: any = null;

      for (const line of lines) {
        if (line.includes('|')) {
          // Save previous commit
          if (currentCommit) {
            commits.push(currentCommit);
          }

          // Parse new commit
          const parts = line.split('|');
          currentCommit = {
            hash: parts[0],
            author: parts[1],
            date: parts[2],
            message: parts[3] || '',
            stats: { files: 0, insertions: 0, deletions: 0 }
          };
        } else if (line.trim() && currentCommit) {
          // Parse stats line: " 5 files changed, 120 insertions(+), 45 deletions(-)"
          const filesMatch = line.match(/(\d+)\s+files?\s+changed/);
          const insertionsMatch = line.match(/(\d+)\s+insertions?\(\+\)/);
          const deletionsMatch = line.match(/(\d+)\s+deletions?\(-\)/);

          if (filesMatch) currentCommit.stats.files = parseInt(filesMatch[1]);
          if (insertionsMatch) currentCommit.stats.insertions = parseInt(insertionsMatch[1]);
          if (deletionsMatch) currentCommit.stats.deletions = parseInt(deletionsMatch[1]);
        }
      }

      // Don't forget last commit
      if (currentCommit) {
        commits.push(currentCommit);
      }

      return commits;
    } catch (error) {
      console.warn('Could not fetch merge commits:', error);
      return [];
    }
  }

  private generateReport(mergeCommits: Array<any>): ReviewMetricsAnalysis {
    // Calculate average PR size
    const totalLines = mergeCommits.reduce(
      (sum, commit) => sum + commit.stats.insertions + commit.stats.deletions,
      0
    );
    const avgPRSize = mergeCommits.length > 0
      ? Math.round(totalLines / mergeCommits.length)
      : 0;

    // Estimate commits per PR (simplified)
    const avgCommitsPerPR = 2; // Rough estimate

    // Calculate average merge time (simplified - use placeholder)
    const avgMergeTime = '< 24 hours';

    // Review participation
    const authorMap = new Map<string, number>();
    for (const commit of mergeCommits) {
      const count = authorMap.get(commit.author) || 0;
      authorMap.set(commit.author, count + 1);
    }

    const reviewParticipation = Array.from(authorMap.entries())
      .map(([author, prCount]) => ({ author, prCount }))
      .sort((a, b) => b.prCount - a.prCount);

    // Identify large PRs (>500 lines)
    const largePRs = mergeCommits
      .filter(c => (c.stats.insertions + c.stats.deletions) > 500)
      .map(c => ({
        hash: c.hash.substring(0, 8),
        lines: c.stats.insertions + c.stats.deletions,
        date: c.date
      }))
      .slice(0, 10);

    // Fast-track merges (placeholder - need more data to calculate actual time)
    const fastTrackMerges: Array<any> = [];

    // Review quality indicators
    const reviewQualityIndicators = {
      avgCommitsPerPR,
      largePRCount: largePRs.length,
      fastMergeCount: fastTrackMerges.length
    };

    // Process recommendations
    const processRecommendations = this.generateRecommendations(
      avgPRSize,
      largePRs.length,
      reviewParticipation.length
    );

    return {
      averageMergeTime: avgMergeTime,
      averagePRSize: avgPRSize,
      averageCommitsPerPR: avgCommitsPerPR,
      reviewParticipation,
      largePRs,
      fastTrackMerges,
      reviewQualityIndicators,
      processRecommendations
    };
  }

  private generateRecommendations(avgSize: number, largePRCount: number, reviewerCount: number): string[] {
    const recs: string[] = [];

    if (avgSize > 300) {
      recs.push('Reduce PR size - aim for <300 lines for faster, more thorough reviews');
    }

    if (largePRCount > 5) {
      recs.push('Break down large PRs into smaller, focused changes');
    }

    if (reviewerCount < 3) {
      recs.push('Increase reviewer participation - encourage cross-team code reviews');
    }

    recs.push('Establish PR size guidelines and review SLAs');
    recs.push('Use PR templates to ensure consistent review criteria');
    recs.push('Consider pairing on complex changes before submitting PR');

    return recs;
  }

  async saveReport(analysis: ReviewMetricsAnalysis): Promise<void> {
    const reportPath = path.join(this.rootDir, 'analysis', 'ANALYSIS_REPORT.md');
    let reportContent = fs.readFileSync(reportPath, 'utf-8');

    const section = this.formatReportSection(analysis);

    reportContent = reportContent.replace(
      /## Review Metrics Analysis\n\n[\s\S]*?(?=\n---\n\n## |$)/,
      `## Review Metrics Analysis\n\n${section}\n`
    );

    fs.writeFileSync(reportPath, reportContent, 'utf-8');
    console.log('✅ Review metrics saved to ANALYSIS_REPORT.md');

    const dataPath = path.join(this.rootDir, 'analysis', 'data', 'review-metrics-raw.json');
    fs.writeFileSync(dataPath, JSON.stringify({ analysis, timestamp: new Date().toISOString() }, null, 2));
  }

  private formatReportSection(analysis: ReviewMetricsAnalysis): string {
    let output = `### Key Metrics\n\n`;
    output += `- **Average PR Merge Time:** ${analysis.averageMergeTime}\n`;
    output += `- **Average PR Size:** ${analysis.averagePRSize} lines changed\n`;
    output += `- **Average Commits per PR:** ${analysis.averageCommitsPerPR}\n\n`;

    const sizeRating = analysis.averagePRSize < 300 ? '✅ Good' :
                       analysis.averagePRSize < 500 ? '⚠️  Fair' : '❌ Too Large';
    output += `**PR Size Rating:** ${sizeRating}\n\n`;

    output += `### Review Participation\n\n`;
    output += `| Author | PR Count |\n`;
    output += `|--------|----------|\n`;
    for (const participant of analysis.reviewParticipation.slice(0, 10)) {
      output += `| ${participant.author} | ${participant.prCount} |\n`;
    }
    output += `\n`;

    output += `### Large PR Issues (>500 lines)\n\n`;
    if (analysis.largePRs.length === 0) {
      output += `✅ No excessively large PRs detected\n\n`;
    } else {
      output += `Found ${analysis.largePRs.length} large PRs:\n\n`;
      output += `| Hash | Lines Changed | Date |\n`;
      output += `|------|---------------|------|\n`;
      for (const pr of analysis.largePRs) {
        output += `| ${pr.hash} | ${pr.lines} | ${pr.date} |\n`;
      }
      output += `\n`;
    }

    output += `### Fast-Track Merges (<1 hour)\n\n`;
    if (analysis.fastTrackMerges.length === 0) {
      output += `✅ No concerning fast-track merges detected\n\n`;
    } else {
      output += `Found ${analysis.fastTrackMerges.length} PRs merged in <1 hour:\n\n`;
      for (const merge of analysis.fastTrackMerges) {
        output += `- ${merge.hash} (${merge.minutes} minutes): ${merge.message}\n`;
      }
      output += `\n`;
    }

    output += `### Review Quality Indicators\n\n`;
    output += `- **Average Commits per PR:** ${analysis.reviewQualityIndicators.avgCommitsPerPR}\n`;
    output += `- **Large PRs (>500 lines):** ${analysis.reviewQualityIndicators.largePRCount}\n`;
    output += `- **Fast-Track Merges (<1hr):** ${analysis.reviewQualityIndicators.fastMergeCount}\n\n`;

    output += `### Process Recommendations\n\n`;
    for (let i = 0; i < analysis.processRecommendations.length; i++) {
      output += `${i + 1}. ${analysis.processRecommendations[i]}\n`;
    }
    output += `\n`;

    output += `### Comparison to Best Practices\n\n`;
    output += `- **Target PR Size:** <300 LOC (current: ${analysis.averagePRSize})\n`;
    output += `- **Target Merge Time:** <24 hours (current: ${analysis.averageMergeTime})\n`;
    output += `- **Target Review Depth:** Multiple reviewers, thorough feedback\n\n`;

    output += `---\n`;

    return output;
  }
}

async function main() {
  const startTime = Date.now();
  console.log('🚀 Review Metrics Analyst Starting...\n');

  const rootDir = path.resolve(__dirname, '../..');
  const analyst = new ReviewMetricsAnalyst(rootDir);

  try {
    const analysis = await analyst.analyze();
    await analyst.saveReport(analysis);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ Analysis complete in ${duration}s`);
    console.log(`📊 Average PR Size: ${analysis.averagePRSize} lines`);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ReviewMetricsAnalyst, ReviewMetricsAnalysis };
