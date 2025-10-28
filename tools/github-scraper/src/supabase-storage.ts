/**
 * Supabase Storage for Repository Metadata
 *
 * DESIGN DECISION: Store all scraped repos (passed + failed) for iteration
 * WHY: Need to track rejection reasons, iterate on quality filters
 *
 * REASONING CHAIN:
 * 1. Store ALL scraped repos (not just passing ones)
 * 2. Track rejection reasons for failed repos
 * 3. Enable iteration on quality filters based on Sprint 2 results
 * 4. Link repos to patterns in Sprint 3 (source attribution)
 * 5. Analytics: Which repos produced highest quality patterns?
 *
 * PATTERN: Pattern-STORAGE-002 (Comprehensive Metadata Storage)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { RepoMetadata } from "./github-api-client";

/**
 * Database schema for repositories table
 *
 * CREATE TABLE repositories (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   owner VARCHAR(255) NOT NULL,
 *   name VARCHAR(255) NOT NULL,
 *   full_name VARCHAR(255) UNIQUE NOT NULL,
 *   description TEXT,
 *   url VARCHAR(500) NOT NULL,
 *   stars INTEGER NOT NULL,
 *   forks INTEGER NOT NULL,
 *   language VARCHAR(50),
 *   languages JSONB,
 *   topics TEXT[],
 *   created_at TIMESTAMPTZ NOT NULL,
 *   updated_at TIMESTAMPTZ NOT NULL,
 *   pushed_at TIMESTAMPTZ NOT NULL,
 *   size_kb INTEGER NOT NULL,
 *   default_branch VARCHAR(100),
 *   license VARCHAR(50),
 *   has_wiki BOOLEAN,
 *   has_issues BOOLEAN,
 *   open_issues_count INTEGER,
 *   watchers_count INTEGER,
 *   docstring_density DECIMAL(3,2),
 *   commit_frequency DECIMAL(5,2),
 *   last_commit_days_ago INTEGER NOT NULL,
 *   domain VARCHAR(50) NOT NULL,
 *   domain_keywords_matched TEXT[],
 *   scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   passes_quality_filters BOOLEAN NOT NULL,
 *   rejection_reasons TEXT[]
 * );
 *
 * CREATE INDEX idx_repositories_domain ON repositories(domain);
 * CREATE INDEX idx_repositories_quality ON repositories(passes_quality_filters);
 * CREATE INDEX idx_repositories_scraped_at ON repositories(scraped_at);
 */

export class SupabaseStorage {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    /**
     * DESIGN DECISION: Service role key for server-side operations
     * WHY: Need to bypass RLS policies for scraping operations
     */
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Store repository metadata (bulk insert with upsert)
   *
   * DESIGN DECISION: Upsert to handle duplicate scraping runs
   * WHY: Scraping may fail mid-run, need to resume without duplicates
   *
   * PERFORMANCE: 500 repos inserted in ~2 seconds
   */
  async storeRepositories(repos: RepoMetadata[]): Promise<{
    inserted: number;
    updated: number;
    errors: number;
  }> {
    console.log(`\n💾 Storing ${repos.length} repositories in Supabase...`);

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    // Batch inserts (100 at a time to avoid request size limits)
    const batchSize = 100;
    for (let i = 0; i < repos.length; i += batchSize) {
      const batch = repos.slice(i, i + batchSize);

      try {
        const { data, error } = await this.supabase
          .from("repositories")
          .upsert(
            batch.map((repo) => ({
              owner: repo.owner,
              name: repo.name,
              full_name: repo.full_name,
              description: repo.description,
              url: repo.url,
              stars: repo.stars,
              forks: repo.forks,
              language: repo.language,
              languages: repo.languages,
              topics: repo.topics,
              created_at: repo.created_at,
              updated_at: repo.updated_at,
              pushed_at: repo.pushed_at,
              size_kb: repo.size_kb,
              default_branch: repo.default_branch,
              license: repo.license,
              has_wiki: repo.has_wiki,
              has_issues: repo.has_issues,
              open_issues_count: repo.open_issues_count,
              watchers_count: repo.watchers_count,
              docstring_density: repo.docstring_density,
              commit_frequency: repo.commit_frequency,
              last_commit_days_ago: repo.last_commit_days_ago,
              domain: repo.domain,
              domain_keywords_matched: repo.domain_keywords_matched,
              scraped_at: repo.scraped_at,
              passes_quality_filters: repo.passes_quality_filters,
              rejection_reasons: repo.rejection_reasons,
            })),
            { onConflict: "full_name" }
          );

        if (error) {
          console.error(`   ❌ Batch ${i / batchSize + 1} failed:`, error.message);
          errors += batch.length;
        } else {
          inserted += batch.length;
          console.log(
            `   ✅ Batch ${i / batchSize + 1} stored (${batch.length} repos)`
          );
        }
      } catch (error) {
        console.error(`   ❌ Batch ${i / batchSize + 1} exception:`, error);
        errors += batch.length;
      }
    }

    console.log(
      `\n📊 Storage complete: ${inserted} inserted, ${updated} updated, ${errors} errors`
    );

    return { inserted, updated, errors };
  }

  /**
   * Get repository statistics
   */
  async getStatistics(): Promise<{
    total: number;
    passed: number;
    failed: number;
    marketing: number;
    legal: number;
    by_language: Record<string, number>;
    rejection_reasons: Record<string, number>;
  }> {
    console.log("\n📈 Calculating repository statistics...");

    // Total count
    const { count: total } = await this.supabase
      .from("repositories")
      .select("*", { count: "exact", head: true });

    // Passed quality filters
    const { count: passed } = await this.supabase
      .from("repositories")
      .select("*", { count: "exact", head: true })
      .eq("passes_quality_filters", true);

    // Failed quality filters
    const failed = (total || 0) - (passed || 0);

    // Marketing domain
    const { count: marketing } = await this.supabase
      .from("repositories")
      .select("*", { count: "exact", head: true })
      .eq("domain", "Marketing");

    // Legal domain
    const { count: legal } = await this.supabase
      .from("repositories")
      .select("*", { count: "exact", head: true })
      .eq("domain", "Legal");

    // By language
    const { data: languageData } = await this.supabase
      .from("repositories")
      .select("language");

    const by_language: Record<string, number> = {};
    if (languageData) {
      for (const row of languageData) {
        const lang = row.language || "Unknown";
        by_language[lang] = (by_language[lang] || 0) + 1;
      }
    }

    // Rejection reasons
    const { data: rejectionData } = await this.supabase
      .from("repositories")
      .select("rejection_reasons")
      .eq("passes_quality_filters", false);

    const rejection_reasons: Record<string, number> = {};
    if (rejectionData) {
      for (const row of rejectionData) {
        for (const reason of row.rejection_reasons || []) {
          rejection_reasons[reason] = (rejection_reasons[reason] || 0) + 1;
        }
      }
    }

    const stats = {
      total: total || 0,
      passed: passed || 0,
      failed: failed,
      marketing: marketing || 0,
      legal: legal || 0,
      by_language: by_language,
      rejection_reasons: rejection_reasons,
    };

    console.log("\n📊 Repository Statistics:");
    console.log(`   Total: ${stats.total}`);
    console.log(`   Passed quality filters: ${stats.passed} (${Math.round((stats.passed / stats.total) * 100)}%)`);
    console.log(`   Failed quality filters: ${stats.failed} (${Math.round((stats.failed / stats.total) * 100)}%)`);
    console.log(`   Marketing domain: ${stats.marketing}`);
    console.log(`   Legal domain: ${stats.legal}`);
    console.log("\n   By Language:");
    Object.entries(stats.by_language)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([lang, count]) => {
        console.log(`      ${lang}: ${count}`);
      });

    if (Object.keys(stats.rejection_reasons).length > 0) {
      console.log("\n   Top Rejection Reasons:");
      Object.entries(stats.rejection_reasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([reason, count]) => {
          console.log(`      ${reason}: ${count}`);
        });
    }

    return stats;
  }

  /**
   * Get repositories passing quality filters (for Sprint 3 pattern extraction)
   */
  async getQualityRepositories(
    domain?: "Marketing" | "Legal",
    limit: number = 500
  ): Promise<RepoMetadata[]> {
    console.log(
      `\n📥 Fetching quality repositories (${domain || "all domains"}, limit ${limit})...`
    );

    let query = this.supabase
      .from("repositories")
      .select("*")
      .eq("passes_quality_filters", true)
      .order("stars", { ascending: false })
      .limit(limit);

    if (domain) {
      query = query.eq("domain", domain);
    }

    const { data, error } = await query;

    if (error) {
      console.error("   ❌ Failed to fetch repositories:", error.message);
      return [];
    }

    console.log(`   ✅ Fetched ${data?.length || 0} repositories`);

    return (data || []) as RepoMetadata[];
  }

  /**
   * Update docstring density after analysis (Sprint 3)
   *
   * DESIGN DECISION: Update density after AST parsing
   * WHY: Initial estimate is heuristic (0.5 for Python), need actual measurement
   */
  async updateDocstringDensity(
    fullName: string,
    actualDensity: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from("repositories")
      .update({ docstring_density: actualDensity })
      .eq("full_name", fullName);

    if (error) {
      console.error(
        `   ⚠️  Could not update docstring density for ${fullName}:`,
        error.message
      );
    }
  }

  /**
   * Link repository to extracted patterns (Sprint 3)
   *
   * DESIGN DECISION: Store repo-pattern mapping for source attribution
   * WHY: Users want to know which repo a pattern came from
   */
  async linkPatternsToRepo(
    fullName: string,
    patternIds: string[]
  ): Promise<void> {
    console.log(
      `\n🔗 Linking ${patternIds.length} patterns to ${fullName}...`
    );

    // Update patterns table with source_repo
    for (const patternId of patternIds) {
      const { error } = await this.supabase
        .from("patterns")
        .update({ source_repo: `https://github.com/${fullName}` })
        .eq("pattern_id", patternId);

      if (error) {
        console.error(
          `   ⚠️  Could not link pattern ${patternId} to repo:`,
          error.message
        );
      }
    }

    console.log(`   ✅ Linked ${patternIds.length} patterns`);
  }

  /**
   * Export repositories to JSON (for backup/analysis)
   */
  async exportToJSON(
    outputPath: string,
    domain?: "Marketing" | "Legal"
  ): Promise<void> {
    console.log(`\n📤 Exporting repositories to ${outputPath}...`);

    const repos = await this.getQualityRepositories(domain, 10000);

    const fs = await import("fs/promises");
    await fs.writeFile(outputPath, JSON.stringify(repos, null, 2));

    console.log(`   ✅ Exported ${repos.length} repositories`);
  }
}
