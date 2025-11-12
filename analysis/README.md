# Multi-Agent Repository Quality Assessment System

This system uses 9 specialized agents to comprehensively evaluate code quality across different dimensions.

## Quick Start

```bash
# Run all agents in sequence
npm run analyze

# Run specific agent
npm run analyze:reliability
npm run analyze:maintainability
npm run analyze:complexity
npm run analyze:churn
npm run analyze:duplication
npm run analyze:coverage
npm run analyze:debt
npm run analyze:sustainability
npm run analyze:reviews

# View the complete report
cat analysis/ANALYSIS_REPORT.md
```

## Architecture

Each agent operates independently and writes findings to the shared `ANALYSIS_REPORT.md` file:

1. **Reliability Analyst** - Error handling, input validation, edge cases
2. **Maintainability Inspector** - Code readability, documentation, architecture
3. **Cyclomatic Complexity Auditor** - Control flow complexity measurement
4. **Code Churn Tracker** - Change frequency and stability analysis
5. **Duplication Detective** - Redundant code detection
6. **Test Coverage Analyst** - Test coverage measurement
7. **Technical Debt Accountant** - Debt calculation and payoff roadmap
8. **Sustainability Metrics Evaluator** - Resource efficiency and performance
9. **Review Metrics Analyst** - Code review process health

## Agent Coordination

- **ANALYSIS_REPORT.md** - Central findings document
- **AGENT_STATUS.md** - Execution tracking
- **data/** - Raw analysis data from each agent

## Requirements

- Node.js 18+
- TypeScript
- Git history access
- Source code read access

## Output

Each agent contributes a section to `ANALYSIS_REPORT.md` with:
- Quantitative metrics (0-100 scores)
- Specific issue locations (file:line references)
- Actionable recommendations
- Code examples and fix suggestions
