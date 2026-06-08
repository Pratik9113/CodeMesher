/**
 * Calculate Lines of Code (LOC) statistics from source code
 */

export const calculateLOC = (content) => {
  if (!content || typeof content !== 'string') {
    return { lines: 0, codeLines: 0, commentLines: 0, blankLines: 0 };
  }

  const lines = content.split('\n');
  let codeLines = 0;
  let commentLines = 0;
  let blankLines = 0;
  let inBlockComment = false;

  lines.forEach(line => {
    const trimmed = line.trim();

    // Check for blank lines
    if (trimmed === '') {
      blankLines++;
      return;
    }

    // Handle block comments
    if (trimmed.startsWith('/*') || trimmed.startsWith('/**')) {
      inBlockComment = true;
    }

    if (inBlockComment) {
      commentLines++;
      if (trimmed.endsWith('*/')) {
        inBlockComment = false;
      }
      return;
    }

    // Handle single-line comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      commentLines++;
      return;
    }

    // Handle inline comments (code with trailing comment)
    if (trimmed.includes('//') || trimmed.includes('#')) {
      codeLines++;
      return;
    }

    // It's a code line
    codeLines++;
  });

  return {
    lines: lines.length,
    codeLines,
    commentLines,
    blankLines
  };
};

/**
 * Calculate LOC statistics for multiple files
 */
export const calculateProjectLOC = (files) => {
  const locByLanguage = {};
  let totalStats = {
    lines: 0,
    codeLines: 0,
    commentLines: 0,
    blankLines: 0
  };

  files.forEach(file => {
    const stats = calculateLOC(file.content);
    
    const language = file.language || 'unknown';
    
    if (!locByLanguage[language]) {
      locByLanguage[language] = {
        lines: 0,
        codeLines: 0,
        commentLines: 0,
        blankLines: 0,
        fileCount: 0
      };
    }

    locByLanguage[language].lines += stats.lines;
    locByLanguage[language].codeLines += stats.codeLines;
    locByLanguage[language].commentLines += stats.commentLines;
    locByLanguage[language].blankLines += stats.blankLines;
    locByLanguage[language].fileCount += 1;

    totalStats.lines += stats.lines;
    totalStats.codeLines += stats.codeLines;
    totalStats.commentLines += stats.commentLines;
    totalStats.blankLines += stats.blankLines;
  });

  return {
    total: totalStats,
    byLanguage: locByLanguage
  };
};
