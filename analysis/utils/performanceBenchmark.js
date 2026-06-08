/**
 * Performance Benchmark Utility for Repository Analysis
 * Measures sequential vs parallel performance
 */

export class PerformanceBenchmark {
  constructor() {
    this.results = [];
    this.currentBenchmark = null;
  }

  /**
   * Start a named benchmark
   */
  start(name) {
    this.currentBenchmark = {
      name,
      startTime: Date.now(),
      startMemory: process.memoryUsage().heapUsed
    };
  }

  /**
   * End the current benchmark
   */
  end() {
    if (!this.currentBenchmark) {
      console.error('No benchmark started');
      return null;
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const duration = endTime - this.currentBenchmark.startTime;
    const memoryUsed = (endMemory - this.currentBenchmark.startMemory) / 1024 / 1024; // MB

    const result = {
      name: this.currentBenchmark.name,
      duration,
      memoryUsed,
      timestamp: new Date().toISOString()
    };

    this.results.push(result);
    return result;
  }

  /**
   * Get summary of benchmarks
   */
  getSummary() {
    return {
      total: this.results.length,
      results: this.results,
      averageDuration: this.results.length > 0 
        ? this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length 
        : 0,
      totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
      totalMemory: this.results.reduce((sum, r) => sum + r.memoryUsed, 0)
    };
  }

  /**
   * Calculate speedup between two benchmarks
   */
  calculateSpeedup(benchmark1Name, benchmark2Name) {
    const b1 = this.results.find(r => r.name === benchmark1Name);
    const b2 = this.results.find(r => r.name === benchmark2Name);

    if (!b1 || !b2) {
      console.error('Benchmarks not found');
      return null;
    }

    return {
      sequential: b1,
      parallel: b2,
      speedup: (b1.duration / b2.duration).toFixed(2) + '×',
      timeSaved: ((b1.duration - b2.duration) / 1000).toFixed(2) + 's'
    };
  }

  /**
   * Log formatted results
   */
  logResults() {
    console.log('\n📊 BENCHMARK RESULTS');
    console.log('='.repeat(70));
    
    this.results.forEach(result => {
      console.log(`\n${result.name}`);
      console.log(`  ⏱️  Duration: ${result.duration}ms (${(result.duration / 1000).toFixed(2)}s)`);
      console.log(`  💾 Memory: ${result.memoryUsed.toFixed(2)}MB`);
    });

    const summary = this.getSummary();
    console.log('\n' + '='.repeat(70));
    console.log(`Total benchmarks: ${summary.total}`);
    console.log(`Total duration: ${summary.totalDuration}ms (${(summary.totalDuration / 1000).toFixed(2)}s)`);
    console.log(`Average duration: ${summary.averageDuration.toFixed(0)}ms`);
  }

  /**
   * Export results as JSON
   */
  export() {
    return JSON.stringify(this.getSummary(), null, 2);
  }
}

/**
 * Performance metrics for analysis
 */
export const addPerformanceMetrics = (analysisResult, benchmark) => {
  return {
    ...analysisResult,
    performance: {
      duration: benchmark.duration,
      durationSeconds: (benchmark.duration / 1000).toFixed(2),
      memoryUsedMB: benchmark.memoryUsed.toFixed(2),
      timestamp: benchmark.timestamp
    }
  };
};
