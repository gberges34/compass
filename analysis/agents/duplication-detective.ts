#!/usr/bin/env ts-node

/**
 * Agent 5: Duplication Detective
 *
 * Detects redundant code blocks, repeated string literals,
 * and similar function implementations.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface DuplicateBlock {
  hash: string;
  locations: Array<{ file: string; line: number }>;
  lines: number;
  code: string;
}

interface DuplicationAnalysis {
  overallDuplicationRate: number;
  totalDuplicateBlocks: number;
  largestCloneFamilies: Array<{
    lines: number;
    occurrences: number;
    similarity: number;
    locations: string[];
    sample: string;
  }>;
  repeatedStrings: Array<{
    string: string;
    count: number;
    files: string[];
  }>;
  refactoringOpportunities: string[];
  impactAssessment: {
    totalLines: number;
    duplicatedLines: number;
    potentialSavings: number;
  };
}

class DuplicationDetective {
  private rootDir: string;
  private codeBlocks: Map<string, DuplicateBlock> = new Map();
  private stringLiterals: Map<string, { count: number; files: Set<string> }> = new Map();
  private totalLines = 0;
  private duplicatedLines = 0;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async analyze(): Promise<DuplicationAnalysis> {
    console.log('🔍 Starting Code Duplication Analysis...');

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
      const lines = content.split('\n');
      this.totalLines += lines.length;

      // Detect duplicate code blocks (sliding window of 6+ lines)
      this.detectDuplicateBlocks(filePath, lines);

      // Detect repeated string literals
      this.detectRepeatedStrings(filePath, content);

    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error);
    }
  }

  private detectDuplicateBlocks(filePath: string, lines: string[]): void {
    const minBlockSize = 6; // Minimum lines to consider as duplicate

    for (let i = 0; i < lines.length - minBlockSize; i++) {
      const block = lines.slice(i, i + minBlockSize);

      // Normalize: remove leading whitespace and empty lines
      const normalized = block
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('//'));

      if (normalized.length < minBlockSize) continue;

      const blockText = normalized.join('\n');
      const hash = crypto.createHash('md5').update(blockText).digest('hex');

      let duplicate = this.codeBlocks.get(hash);
      if (!duplicate) {
        duplicate = {
          hash,
          locations: [],
          lines: minBlockSize,
          code: blockText.substring(0, 200) // Sample
        };
        this.codeBlocks.set(hash, duplicate);
      }

      duplicate.locations.push({
        file: path.relative(this.rootDir, filePath),
        line: i + 1
      });
    }
  }

  private detectRepeatedStrings(filePath: string, content: string): void {
    // Find string literals
    const stringRegex = /(['"`])(?:(?=(\\?))\2.)*?\1/g;
    let match;

    while ((match = stringRegex.exec(content)) !== null) {
      const str = match[0];

      // Ignore short strings and common patterns
      if (str.length < 15) continue;
      if (str.includes('import') || str.includes('require')) continue;

      let entry = this.stringLiterals.get(str);
      if (!entry) {
        entry = { count: 0, files: new Set() };
        this.stringLiterals.set(str, entry);
      }

      entry.count++;
      entry.files.add(path.relative(this.rootDir, filePath));
    }
  }

  private generateReport(): DuplicationAnalysis {
    // Filter to actual duplicates (appears 2+ times in different locations)
    const actualDuplicates = Array.from(this.codeBlocks.values())
      .filter(block => {
        // Count unique file+line combinations
        const uniqueLocations = new Set(
          block.locations.map(loc => `${loc.file}:${loc.line}`)
        );
        return uniqueLocations.size > 1;
      });

    // Calculate duplication rate
    this.duplicatedLines = actualDuplicates.reduce(
      (sum, block) => sum + (block.locations.length * block.lines),
      0
    );

    const duplicationRate = this.totalLines > 0
      ? Math.round((this.duplicatedLines / this.totalLines) * 100)
      : 0;

    // Largest clone families
    const largestClones = actualDuplicates
      .sort((a, b) => (b.lines * b.locations.length) - (a.lines * a.locations.length))
      .slice(0, 10)
      .map(block => ({
        lines: block.lines,
        occurrences: block.locations.length,
        similarity: 100, // Exact match
        locations: block.locations.map(loc => `${loc.file}:${loc.line}`),
        sample: block.code
      }));

    // Repeated string literals (3+ occurrences)
    const repeatedStrings = Array.from(this.stringLiterals.entries())
      .filter(([_, data]) => data.count >= 3)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([str, data]) => ({
        string: str.substring(0, 50) + (str.length > 50 ? '...' : ''),
        count: data.count,
        files: Array.from(data.files)
      }));

    // Refactoring opportunities
    const refactoringOpportunities = this.identifyRefactoringOpportunities(
      actualDuplicates,
      repeatedStrings
    );

    // Impact assessment
    const potentialSavings = Math.max(0, this.duplicatedLines - (actualDuplicates.length * 10));

    return {
      overallDuplicationRate: duplicationRate,
      totalDuplicateBlocks: actualDuplicates.length,
      largestCloneFamilies: largestClones,
      repeatedStrings,
      refactoringOpportunities,
      impactAssessment: {
        totalLines: this.totalLines,
        duplicatedLines: this.duplicatedLines,
        potentialSavings
      }
    };
  }

  private identifyRefactoringOpportunities(
    duplicates: DuplicateBlock[],
    strings: Array<any>
  ): string[] {
    const opportunities: string[] = [];

    if (duplicates.length > 10) {
      opportunities.push(
        `Extract ${duplicates.length} duplicate code blocks into reusable functions/utilities`
      );
    }

    const largeClones = duplicates.filter(d => d.lines > 20);
    if (largeClones.length > 0) {
      opportunities.push(
        `${largeClones.length} large code blocks (>20 lines) are duplicated - high priority for extraction`
      );
    }

    if (strings.length > 5) {
      opportunities.push(
        `Move ${strings.length} repeated string literals to constants or configuration`
      );
    }

    const multiFileDuplicates = duplicates.filter(d => {
      const uniqueFiles = new Set(d.locations.map(loc => loc.file));
      return uniqueFiles.size > 1;
    });

    if (multiFileDuplicates.length > 0) {
      opportunities.push(
        `${multiFileDuplicates.length} code blocks duplicated across multiple files - create shared modules`
      );
    }

    if (opportunities.length === 0) {
      opportunities.push('Code duplication is minimal - good DRY practices observed');
    }

    return opportunities;
  }

  async saveReport(analysis: DuplicationAnalysis): Promise<void> {
    const reportPath = path.join(this.rootDir, 'analysis', 'ANALYSIS_REPORT.md');
    let reportContent = fs.readFileSync(reportPath, 'utf-8');

    const section = this.formatReportSection(analysis);

    reportContent = reportContent.replace(
      /## Code Duplication Analysis\n\n[\s\S]*?(?=\n---\n\n## |$)/,
      `## Code Duplication Analysis\n\n${section}\n`
    );

    fs.writeFileSync(reportPath, reportContent, 'utf-8');
    console.log('✅ Duplication analysis saved to ANALYSIS_REPORT.md');

    const dataPath = path.join(this.rootDir, 'analysis', 'data', 'duplication-raw.json');
    fs.writeFileSync(dataPath, JSON.stringify({
      analysis,
      duplicateBlocks: Array.from(this.codeBlocks.values()),
      timestamp: new Date().toISOString()
    }, null, 2));
    console.log('✅ Raw data saved to data/duplication-raw.json');
  }

  private formatReportSection(analysis: DuplicationAnalysis): string {
    let output = `**Overall Duplication Rate:** ${analysis.overallDuplicationRate}%\n\n`;

    output += `### Key Metrics\n\n`;
    output += `- **Total Lines:** ${analysis.impactAssessment.totalLines.toLocaleString()}\n`;
    output += `- **Duplicated Lines:** ${analysis.impactAssessment.duplicatedLines.toLocaleString()}\n`;
    output += `- **Total Duplicate Blocks:** ${analysis.totalDuplicateBlocks}\n`;
    output += `- **Potential Line Savings:** ${analysis.impactAssessment.potentialSavings.toLocaleString()}\n\n`;

    output += `### Top 10 Largest Clone Families\n\n`;
    if (analysis.largestCloneFamilies.length === 0) {
      output += `✅ No significant code duplication detected!\n\n`;
    } else {
      output += `| Lines | Occurrences | Locations |\n`;
      output += `|-------|-------------|----------|\n`;
      for (const clone of analysis.largestCloneFamilies) {
        const locationList = clone.locations.slice(0, 3).join(', ') +
          (clone.locations.length > 3 ? ` +${clone.locations.length - 3} more` : '');
        output += `| ${clone.lines} | ${clone.occurrences} | ${locationList} |\n`;
      }
      output += `\n`;

      // Show sample of first clone
      if (analysis.largestCloneFamilies[0]) {
        const sample = analysis.largestCloneFamilies[0].sample;
        output += `**Sample of largest duplication:**\n\n`;
        output += `\`\`\`typescript\n${sample}\n...\n\`\`\`\n\n`;
      }
    }

    output += `### Repeated String Literals (Top 10)\n\n`;
    if (analysis.repeatedStrings.length === 0) {
      output += `✅ No excessive string literal repetition\n\n`;
    } else {
      for (const str of analysis.repeatedStrings) {
        output += `- **${str.count} occurrences:** \`${str.string}\`\n`;
        output += `  - Files: ${str.files.slice(0, 3).join(', ')}${str.files.length > 3 ? '...' : ''}\n`;
      }
      output += `\n`;
    }

    output += `### Refactoring Opportunities\n\n`;
    for (let i = 0; i < analysis.refactoringOpportunities.length; i++) {
      output += `${i + 1}. ${analysis.refactoringOpportunities[i]}\n`;
    }
    output += `\n`;

    output += `### Impact Assessment\n\n`;
    const percentSavings = analysis.impactAssessment.totalLines > 0
      ? Math.round((analysis.impactAssessment.potentialSavings / analysis.impactAssessment.totalLines) * 100)
      : 0;

    output += `By extracting duplicate code into reusable functions and constants:\n`;
    output += `- **Estimated LOC Reduction:** ${analysis.impactAssessment.potentialSavings.toLocaleString()} lines (${percentSavings}%)\n`;
    output += `- **Maintenance Effort Reduction:** Updates in one place instead of ${analysis.totalDuplicateBlocks} locations\n`;
    output += `- **Bug Risk Reduction:** Single source of truth eliminates inconsistencies\n\n`;

    output += `### Example Refactoring\n\n`;
    output += `\`\`\`typescript\n`;
    output += `// ❌ Before: Duplicated validation logic\n`;
    output += `// File1.ts\n`;
    output += `if (!user.email || !user.email.includes('@')) {\n`;
    output += `  throw new Error('Invalid email');\n`;
    output += `}\n\n`;
    output += `// File2.ts\n`;
    output += `if (!user.email || !user.email.includes('@')) {\n`;
    output += `  throw new Error('Invalid email');\n`;
    output += `}\n\n`;
    output += `// File3.ts\n`;
    output += `if (!user.email || !user.email.includes('@')) {\n`;
    output += `  throw new Error('Invalid email');\n`;
    output += `}\n\n`;
    output += `// ✅ After: Extracted to shared utility\n`;
    output += `// utils/validation.ts\n`;
    output += `export function validateEmail(email: string): void {\n`;
    output += `  if (!email || !email.includes('@')) {\n`;
    output += `    throw new Error('Invalid email');\n`;
    output += `  }\n`;
    output += `}\n\n`;
    output += `// All files now use:\n`;
    output += `import { validateEmail } from './utils/validation';\n`;
    output += `validateEmail(user.email);\n`;
    output += `\`\`\`\n`;

    output += `\n---\n`;

    return output;
  }
}

// Main execution
async function main() {
  const startTime = Date.now();
  console.log('🚀 Duplication Detective Starting...\n');

  const rootDir = path.resolve(__dirname, '../..');
  const detective = new DuplicationDetective(rootDir);

  try {
    const analysis = await detective.analyze();
    await detective.saveReport(analysis);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ Analysis complete in ${duration}s`);
    console.log(`📊 Duplication Rate: ${analysis.overallDuplicationRate}%`);
    console.log(`📦 Duplicate Blocks: ${analysis.totalDuplicateBlocks}`);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { DuplicationDetective, DuplicationAnalysis };
