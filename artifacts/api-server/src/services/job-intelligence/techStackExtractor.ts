/**
 * Tech Stack Extractor
 *
 * Detects technologies mentioned in job descriptions using keyword matching
 * with normalization. Also identifies common stack combinations (MERN, MEAN, etc.).
 */

// ─── Skill Normalization Map ────────────────────────────────────────────────
// Maps common aliases/typos to canonical names

const NORMALIZATION_MAP: Record<string, string> = {
  // JavaScript ecosystem
  "reactjs": "React",
  "react.js": "React",
  "react js": "React",
  "nodejs": "Node.js",
  "node": "Node.js",
  "node js": "Node.js",
  "nextjs": "Next.js",
  "next": "Next.js",
  "next js": "Next.js",
  "expressjs": "Express",
  "express.js": "Express",
  "express js": "Express",
  "vuejs": "Vue.js",
  "vue": "Vue.js",
  "vue js": "Vue.js",
  "vue.js": "Vue.js",
  "angularjs": "Angular",
  "angular js": "Angular",
  "nuxtjs": "Nuxt.js",
  "nuxt": "Nuxt.js",
  "sveltejs": "Svelte",
  "sveltekit": "SvelteKit",
  "javascript": "JavaScript",
  "js": "JavaScript",
  "typescript": "TypeScript",
  "ts": "TypeScript",
  "jquery": "jQuery",

  // Databases
  "mongodb": "MongoDB",
  "mongo": "MongoDB",
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "psql": "PostgreSQL",
  "mysql": "MySQL",
  "mariadb": "MariaDB",
  "redis": "Redis",
  "dynamodb": "DynamoDB",
  "cassandra": "Cassandra",
  "elasticsearch": "Elasticsearch",
  "elastic search": "Elasticsearch",
  "neo4j": "Neo4j",
  "sqlite": "SQLite",
  "mssql": "SQL Server",
  "sql server": "SQL Server",
  "firebase": "Firebase",
  "supabase": "Supabase",

  // Python ecosystem
  "python": "Python",
  "python3": "Python",
  "django": "Django",
  "flask": "Flask",
  "fastapi": "FastAPI",
  "fast api": "FastAPI",
  "pandas": "Pandas",
  "numpy": "NumPy",
  "scipy": "SciPy",
  "scikit-learn": "Scikit-learn",
  "sklearn": "Scikit-learn",

  // AI / ML
  "tensorflow": "TensorFlow",
  "tf": "TensorFlow",
  "pytorch": "PyTorch",
  "torch": "PyTorch",
  "keras": "Keras",
  "langchain": "LangChain",
  "openai": "OpenAI APIs",
  "openai api": "OpenAI APIs",
  "gpt": "OpenAI APIs",
  "huggingface": "Hugging Face",
  "hugging face": "Hugging Face",

  // Java ecosystem
  "java": "Java",
  "spring": "Spring Boot",
  "spring boot": "Spring Boot",
  "springboot": "Spring Boot",
  "hibernate": "Hibernate",
  "kotlin": "Kotlin",

  // Cloud & DevOps
  "aws": "AWS",
  "amazon web services": "AWS",
  "gcp": "GCP",
  "google cloud": "GCP",
  "google cloud platform": "GCP",
  "azure": "Azure",
  "microsoft azure": "Azure",
  "docker": "Docker",
  "kubernetes": "Kubernetes",
  "k8s": "Kubernetes",
  "terraform": "Terraform",
  "ansible": "Ansible",
  "jenkins": "Jenkins",
  "ci/cd": "CI/CD",
  "cicd": "CI/CD",
  "github actions": "GitHub Actions",
  "gitlab ci": "GitLab CI",
  "circleci": "CircleCI",

  // Other languages
  "golang": "Go",
  "go lang": "Go",
  "rust": "Rust",
  "c++": "C++",
  "cpp": "C++",
  "c#": "C#",
  "csharp": "C#",
  ".net": ".NET",
  "dotnet": ".NET",
  "asp.net": "ASP.NET",
  "ruby": "Ruby",
  "ruby on rails": "Ruby on Rails",
  "rails": "Ruby on Rails",
  "php": "PHP",
  "laravel": "Laravel",
  "swift": "Swift",
  "swiftui": "SwiftUI",
  "objective-c": "Objective-C",
  "r lang": "R",
  "scala": "Scala",
  "elixir": "Elixir",

  // Frontend / Design
  "html": "HTML",
  "html5": "HTML",
  "css": "CSS",
  "css3": "CSS",
  "sass": "Sass",
  "scss": "Sass",
  "less": "Less",
  "tailwind": "TailwindCSS",
  "tailwindcss": "TailwindCSS",
  "bootstrap": "Bootstrap",
  "material ui": "Material UI",
  "mui": "Material UI",
  "chakra ui": "Chakra UI",
  "figma": "Figma",

  // Data / BI
  "power bi": "Power BI",
  "powerbi": "Power BI",
  "tableau": "Tableau",
  "looker": "Looker",
  "apache spark": "Apache Spark",
  "spark": "Apache Spark",
  "kafka": "Kafka",
  "apache kafka": "Kafka",
  "airflow": "Apache Airflow",
  "apache airflow": "Apache Airflow",
  "hadoop": "Hadoop",
  "snowflake": "Snowflake",
  "databricks": "Databricks",
  "dbt": "dbt",

  // Mobile
  "react native": "React Native",
  "flutter": "Flutter",
  "dart": "Dart",
  "android": "Android",
  "ios": "iOS",

  // Tools / Misc
  "git": "Git",
  "github": "GitHub",
  "gitlab": "GitLab",
  "linux": "Linux",
  "nginx": "Nginx",
  "graphql": "GraphQL",
  "rest api": "REST API",
  "restful": "REST API",
  "grpc": "gRPC",
  "rabbitmq": "RabbitMQ",
  "webpack": "Webpack",
  "vite": "Vite",
  "jest": "Jest",
  "cypress": "Cypress",
  "playwright": "Playwright",
  "selenium": "Selenium",
  "jira": "Jira",
  "agile": "Agile",
  "scrum": "Scrum",
  "microservices": "Microservices",
  "serverless": "Serverless",
};

// ─── Canonical Technology List ──────────────────────────────────────────────

const CANONICAL_TECHS = Array.from(new Set(Object.values(NORMALIZATION_MAP)));

// ─── Known Stack Combinations ───────────────────────────────────────────────

const STACK_COMBINATIONS: { name: string; techs: string[] }[] = [
  { name: "MERN", techs: ["MongoDB", "Express", "React", "Node.js"] },
  { name: "MEAN", techs: ["MongoDB", "Express", "Angular", "Node.js"] },
  { name: "MEVN", techs: ["MongoDB", "Express", "Vue.js", "Node.js"] },
  { name: "LAMP", techs: ["Linux", "Apache", "MySQL", "PHP"] },
  { name: "JAMstack", techs: ["JavaScript", "REST API", "Markdown"] },
  { name: "Python + Django + AWS", techs: ["Python", "Django", "AWS"] },
  { name: "Python + FastAPI + AWS", techs: ["Python", "FastAPI", "AWS"] },
  { name: "Python + Flask + AWS", techs: ["Python", "Flask", "AWS"] },
  { name: "Next.js + PostgreSQL", techs: ["Next.js", "PostgreSQL"] },
  { name: "React + Node.js + PostgreSQL", techs: ["React", "Node.js", "PostgreSQL"] },
  { name: "React + Node.js + MongoDB", techs: ["React", "Node.js", "MongoDB"] },
  { name: "Java + Spring Boot + AWS", techs: ["Java", "Spring Boot", "AWS"] },
  { name: "Python + TensorFlow + AWS", techs: ["Python", "TensorFlow", "AWS"] },
  { name: "Python + PyTorch + GCP", techs: ["Python", "PyTorch", "GCP"] },
  { name: "React + TypeScript + Node.js", techs: ["React", "TypeScript", "Node.js"] },
  { name: "Vue.js + Node.js + PostgreSQL", techs: ["Vue.js", "Node.js", "PostgreSQL"] },
  { name: "Angular + Java + Spring Boot", techs: ["Angular", "Java", "Spring Boot"] },
  { name: "Flutter + Firebase", techs: ["Flutter", "Firebase"] },
  { name: "React Native + Node.js", techs: ["React Native", "Node.js"] },
  { name: ".NET + Azure + SQL Server", techs: [".NET", "Azure", "SQL Server"] },
  { name: "Go + Kubernetes + Docker", techs: ["Go", "Kubernetes", "Docker"] },
];

/**
 * Normalize a single skill name to its canonical form.
 */
export function normalizeSkill(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  if (NORMALIZATION_MAP[lower]) {
    return NORMALIZATION_MAP[lower];
  }
  // Check if it's already a canonical name (case-insensitive)
  const canonical = CANONICAL_TECHS.find((t) => t.toLowerCase() === lower);
  return canonical ?? null;
}

/**
 * Extract all technologies mentioned in a job description.
 * Returns an array of normalized, deduplicated tech names.
 */
export function extractTechStack(description: string): string[] {
  if (!description) return [];

  const descLower = description.toLowerCase();
  const found = new Set<string>();

  // Build lookup: all keys are potential matches
  const allPatterns = new Map<string, string>();
  for (const [alias, canonical] of Object.entries(NORMALIZATION_MAP)) {
    allPatterns.set(alias, canonical);
  }
  // Also add canonical names themselves
  for (const tech of CANONICAL_TECHS) {
    allPatterns.set(tech.toLowerCase(), tech);
  }

  // Sort by length descending so longer patterns match first (e.g., "react native" before "react")
  const sortedPatterns = Array.from(allPatterns.entries()).sort(
    (a, b) => b[0].length - a[0].length,
  );

  for (const [pattern, canonical] of sortedPatterns) {
    if (found.has(canonical)) continue;

    // Escape special regex chars in the pattern
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Use word boundaries for single-word patterns, looser matching for multi-word
    const regex = pattern.includes(" ")
      ? new RegExp(`(?:^|[\\s,;.(])${escaped}(?:[\\s,;.)]|$)`, "i")
      : new RegExp(`\\b${escaped}\\b`, "i");

    if (regex.test(descLower)) {
      found.add(canonical);
    }
  }

  return Array.from(found).sort();
}

/**
 * Detect which known stack combinations are present in a set of technologies.
 */
export function detectStackCombinations(
  techsPerJob: string[][],
): { stack: string; count: number }[] {
  const comboCounts: Record<string, number> = {};

  for (const jobTechs of techsPerJob) {
    const jobTechSet = new Set(jobTechs);

    for (const combo of STACK_COMBINATIONS) {
      if (combo.techs.every((t) => jobTechSet.has(t))) {
        comboCounts[combo.name] = (comboCounts[combo.name] || 0) + 1;
      }
    }
  }

  return Object.entries(comboCounts)
    .map(([stack, count]) => ({ stack, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Normalize an array of raw skills to canonical form.
 */
export function normalizeSkills(rawSkills: string[]): string[] {
  const normalized = new Set<string>();
  for (const raw of rawSkills) {
    const norm = normalizeSkill(raw);
    if (norm) normalized.add(norm);
  }
  return Array.from(normalized).sort();
}
