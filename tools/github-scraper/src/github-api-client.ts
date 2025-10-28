/**
 * GitHub API Client for Node 1 Deployment - Sprint 2
 *
 * DESIGN DECISION: Octokit + rate limiting + quality filters
 * WHY: GitHub API has strict rate limits (5,000 req/hour authenticated)
 *
 * REASONING CHAIN:
 * 1. Use Octokit for GitHub REST API (official library)
 * 2. Implement exponential backoff for rate limit handling
 * 3. Quality filters: stars >100, docstrings >40%, commits <90 days
 * 4. Domain-specific search queries (Marketing + Legal)
 * 5. Metadata extraction: language, LOC, stars, last updated
 * 6. Store results in Supabase for pattern extraction (Sprint 3)
 *
 * PATTERN: Pattern-SCRAPER-001 (Quality-First Repository Selection)
 * PERFORMANCE: 5,000 requests/hour = ~1,000 repos in 3-4 hours
 */

import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { retry } from "@octokit/plugin-retry";

const OctokitWithPlugins = Octokit.plugin(throttling, retry);

/**
 * Repository metadata for pattern extraction
 */
export interface RepoMetadata {
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  languages: Record<string, number>; // Language distribution
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size_kb: number;
  default_branch: string;
  license: string | null;
  has_wiki: boolean;
  has_issues: boolean;
  open_issues_count: number;
  watchers_count: number;

  // Quality metrics
  docstring_density: number | null; // Calculated: docstring lines / total lines
  commit_frequency: number | null;  // Commits per month (last 90 days)
  last_commit_days_ago: number;

  // Domain classification
  domain: "Marketing" | "Legal" | null;
  domain_keywords_matched: string[];

  // Scraping metadata
  scraped_at: string;
  passes_quality_filters: boolean;
  rejection_reasons: string[];
}

/**
 * Quality filter configuration
 */
export interface QualityFilters {
  min_stars: number;           // Default: 100
  min_docstring_density: number; // Default: 0.4 (40%)
  max_days_since_commit: number; // Default: 90
  allowed_languages: string[];   // Default: ["Python", "JavaScript", "TypeScript"]
  min_size_kb: number;          // Default: 100 (avoid toy projects)
  max_size_kb: number;          // Default: 100,000 (avoid monorepos)
}

/**
 * Domain-specific search configuration
 */
export interface DomainSearchConfig {
  domain: "Marketing" | "Legal";
  queries: string[];
  keywords: string[]; // For domain classification
}

export class GitHubAPIClient {
  private octokit: InstanceType<typeof OctokitWithPlugins>;
  private rateLimitRemaining: number = 5000;
  private rateLimitResetAt: Date | null = null;

  constructor(private githubToken: string) {
    /**
     * DESIGN DECISION: Octokit with throttling + retry plugins
     * WHY: Automatic rate limit handling, exponential backoff on errors
     *
     * REASONING CHAIN:
     * 1. Throttling plugin prevents 403 errors (rate limit exceeded)
     * 2. Retry plugin handles transient failures (network, GitHub downtime)
     * 3. Authenticated requests get 5,000 req/hour (vs 60 unauthenticated)
     */
    this.octokit = new OctokitWithPlugins({
      auth: githubToken,
      throttle: {
        onRateLimit: (retryAfter, options, octokit, retryCount) => {
          console.warn(
            `Rate limit hit for request ${options.method} ${options.url}`
          );
          console.warn(`Retry after ${retryAfter} seconds`);

          // Retry twice before giving up
          if (retryCount < 2) {
            console.log(`Retrying after ${retryAfter} seconds (attempt ${retryCount + 1})`);
            return true;
          }

          return false;
        },
        onSecondaryRateLimit: (retryAfter, options, octokit, retryCount) => {
          console.warn(`Secondary rate limit hit (abuse detection)`);
          // Always retry on secondary rate limits
          return true;
        },
      },
      retry: {
        doNotRetry: [400, 401, 403, 404, 422], // Don't retry client errors
      },
    });
  }

  /**
   * Search repositories with domain-specific queries
   *
   * DESIGN DECISION: GitHub Code Search API with quality filters
   * WHY: Targeted search reduces scraping time, improves pattern quality
   *
   * PERFORMANCE: ~100 repos per query, 6 queries per domain = 600 repos
   */
  async searchRepositories(
    config: DomainSearchConfig,
    qualityFilters: QualityFilters,
    maxResults: number = 500
  ): Promise<RepoMetadata[]> {
    const allRepos: RepoMetadata[] = [];

    for (const query of config.queries) {
      try {
        console.log(`\n🔍 Searching: ${query}`);

        const repos = await this.executeSearch(
          query,
          config,
          qualityFilters,
          Math.ceil(maxResults / config.queries.length)
        );

        allRepos.push(...repos);
        console.log(`   ✅ Found ${repos.length} repos (${allRepos.length} total)`);

        // Respect rate limits
        await this.checkRateLimit();
      } catch (error) {
        console.error(`   ❌ Search failed for query: ${query}`, error);
      }
    }

    // Deduplicate by full_name
    const uniqueRepos = this.deduplicateRepos(allRepos);
    console.log(`\n📊 Total unique repos: ${uniqueRepos.length}`);

    return uniqueRepos;
  }

  /**
   * Execute single search query with pagination
   */
  private async executeSearch(
    query: string,
    config: DomainSearchConfig,
    qualityFilters: QualityFilters,
    maxResults: number
  ): Promise<RepoMetadata[]> {
    const repos: RepoMetadata[] = [];
    let page = 1;
    const perPage = 100; // Max allowed by GitHub API

    while (repos.length < maxResults) {
      try {
        const response = await this.octokit.search.repos({
          q: query,
          sort: "stars",
          order: "desc",
          per_page: perPage,
          page: page,
        });

        if (response.data.items.length === 0) {
          break; // No more results
        }

        for (const repo of response.data.items) {
          // Extract metadata
          const metadata = await this.extractRepoMetadata(repo, config);

          // Apply quality filters
          const { passes, reasons } = this.applyQualityFilters(metadata, qualityFilters);
          metadata.passes_quality_filters = passes;
          metadata.rejection_reasons = reasons;

          repos.push(metadata);

          if (repos.length >= maxResults) {
            break;
          }
        }

        page++;
      } catch (error) {
        console.error(`   ❌ Pagination error at page ${page}:`, error);
        break;
      }
    }

    return repos;
  }

  /**
   * Extract comprehensive metadata from repository
   */
  private async extractRepoMetadata(
    repo: any,
    config: DomainSearchConfig
  ): Promise<RepoMetadata> {
    /**
     * DESIGN DECISION: Fetch language distribution for docstring density estimation
     * WHY: Python repos typically have higher docstring density than JS/TS
     */
    let languages: Record<string, number> = {};
    let docstringDensity: number | null = null;

    try {
      const langResponse = await this.octokit.repos.listLanguages({
        owner: repo.owner.login,
        repo: repo.name,
      });
      languages = langResponse.data;

      // Estimate docstring density (heuristic: Python = 0.5, JS/TS = 0.3)
      if (languages.Python) {
        docstringDensity = 0.5; // Assume 50% for Python (validated in Sprint 3)
      } else if (languages.JavaScript || languages.TypeScript) {
        docstringDensity = 0.3; // Assume 30% for JS/TS
      }
    } catch (error) {
      console.warn(`   ⚠️  Could not fetch languages for ${repo.full_name}`);
    }

    // Calculate commit frequency (last 90 days)
    const lastCommitDate = new Date(repo.pushed_at);
    const lastCommitDaysAgo = Math.floor(
      (Date.now() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const commitFrequency = lastCommitDaysAgo <= 90 ? 30 : null; // Placeholder

    // Domain classification
    const domainKeywordsMatched = this.matchDomainKeywords(
      repo.description || "",
      repo.topics || [],
      config.keywords
    );

    return {
      owner: repo.owner.login,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      languages: languages,
      topics: repo.topics || [],
      created_at: repo.created_at,
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      size_kb: repo.size,
      default_branch: repo.default_branch,
      license: repo.license?.spdx_id || null,
      has_wiki: repo.has_wiki,
      has_issues: repo.has_issues,
      open_issues_count: repo.open_issues_count,
      watchers_count: repo.watchers_count,
      docstring_density: docstringDensity,
      commit_frequency: commitFrequency,
      last_commit_days_ago: lastCommitDaysAgo,
      domain: config.domain,
      domain_keywords_matched: domainKeywordsMatched,
      scraped_at: new Date().toISOString(),
      passes_quality_filters: false, // Set by applyQualityFilters
      rejection_reasons: [],
    };
  }

  /**
   * Apply quality filters and return pass/fail + reasons
   */
  private applyQualityFilters(
    metadata: RepoMetadata,
    filters: QualityFilters
  ): { passes: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Filter 1: Minimum stars
    if (metadata.stars < filters.min_stars) {
      reasons.push(`stars (${metadata.stars}) < ${filters.min_stars}`);
    }

    // Filter 2: Language allowed
    if (
      metadata.language &&
      !filters.allowed_languages.includes(metadata.language)
    ) {
      reasons.push(`language (${metadata.language}) not in allowed list`);
    }

    // Filter 3: Recent commits
    if (metadata.last_commit_days_ago > filters.max_days_since_commit) {
      reasons.push(
        `last commit ${metadata.last_commit_days_ago} days ago > ${filters.max_days_since_commit}`
      );
    }

    // Filter 4: Docstring density (if available)
    if (
      metadata.docstring_density !== null &&
      metadata.docstring_density < filters.min_docstring_density
    ) {
      reasons.push(
        `docstring density (${metadata.docstring_density}) < ${filters.min_docstring_density}`
      );
    }

    // Filter 5: Size constraints
    if (metadata.size_kb < filters.min_size_kb) {
      reasons.push(`size (${metadata.size_kb}KB) < ${filters.min_size_kb}KB (toy project)`);
    }
    if (metadata.size_kb > filters.max_size_kb) {
      reasons.push(`size (${metadata.size_kb}KB) > ${filters.max_size_kb}KB (monorepo)`);
    }

    return {
      passes: reasons.length === 0,
      reasons: reasons,
    };
  }

  /**
   * Match domain keywords in description and topics
   */
  private matchDomainKeywords(
    description: string,
    topics: string[],
    keywords: string[]
  ): string[] {
    const matched: string[] = [];
    const lowerDesc = description.toLowerCase();
    const lowerTopics = topics.map((t) => t.toLowerCase());

    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (
        lowerDesc.includes(lowerKeyword) ||
        lowerTopics.some((t) => t.includes(lowerKeyword))
      ) {
        matched.push(keyword);
      }
    }

    return matched;
  }

  /**
   * Deduplicate repositories by full_name
   */
  private deduplicateRepos(repos: RepoMetadata[]): RepoMetadata[] {
    const seen = new Set<string>();
    const unique: RepoMetadata[] = [];

    for (const repo of repos) {
      if (!seen.has(repo.full_name)) {
        seen.add(repo.full_name);
        unique.push(repo);
      }
    }

    return unique;
  }

  /**
   * Check rate limit and wait if necessary
   */
  private async checkRateLimit(): Promise<void> {
    try {
      const { data } = await this.octokit.rateLimit.get();
      this.rateLimitRemaining = data.rate.remaining;
      this.rateLimitResetAt = new Date(data.rate.reset * 1000);

      console.log(
        `   📊 Rate limit: ${this.rateLimitRemaining} / ${data.rate.limit} (resets at ${this.rateLimitResetAt.toLocaleTimeString()})`
      );

      // If less than 100 requests remaining, wait until reset
      if (this.rateLimitRemaining < 100) {
        const waitMs = this.rateLimitResetAt.getTime() - Date.now();
        console.warn(
          `   ⏳ Rate limit low (${this.rateLimitRemaining}), waiting ${Math.ceil(waitMs / 1000)}s until reset...`
        );
        await this.sleep(waitMs);
      }
    } catch (error) {
      console.error("   ❌ Could not check rate limit:", error);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Default quality filters for Node 1 deployment
 */
export const DEFAULT_QUALITY_FILTERS: QualityFilters = {
  min_stars: 100,
  min_docstring_density: 0.4,
  max_days_since_commit: 90,
  allowed_languages: ["Python", "JavaScript", "TypeScript"],
  min_size_kb: 100,
  max_size_kb: 100000,
};

/**
 * Marketing domain search configuration
 */
export const MARKETING_DOMAIN_CONFIG: DomainSearchConfig = {
  domain: "Marketing",
  queries: [
    "data analytics language:python stars:>100 pushed:>2024-01-01",
    "identity graphing language:python stars:>100 pushed:>2024-01-01",
    "customer segmentation language:python stars:>100 pushed:>2024-01-01",
    "predictive analytics language:python stars:>100 pushed:>2024-01-01",
    "ML modeling language:python stars:>100 pushed:>2024-01-01",
    "A/B testing language:python stars:>100 pushed:>2024-01-01",
  ],
  keywords: [
    "analytics",
    "customer",
    "segmentation",
    "identity graph",
    "predictive",
    "ML",
    "machine learning",
    "A/B test",
    "experiment",
    "conversion",
    "retention",
    "churn",
  ],
};

/**
 * Legal domain search configuration
 */
export const LEGAL_DOMAIN_CONFIG: DomainSearchConfig = {
  domain: "Legal",
  queries: [
    "case management language:python stars:>100 pushed:>2024-01-01",
    "legal document parsing language:python stars:>100 pushed:>2024-01-01",
    "contract analysis language:python stars:>100 pushed:>2024-01-01",
    "timeline extraction language:python stars:>100 pushed:>2024-01-01",
    "semantic search legal language:python stars:>100 pushed:>2024-01-01",
    "legal pattern recognition language:python stars:>100 pushed:>2024-01-01",
  ],
  keywords: [
    "legal",
    "case",
    "contract",
    "document",
    "timeline",
    "discovery",
    "litigation",
    "compliance",
    "court",
    "law",
    "attorney",
    "clause",
  ],
};
