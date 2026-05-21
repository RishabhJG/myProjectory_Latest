import axios from "axios";
import { db, jobListingsTable, type InsertJobListing } from "../lib/db/index.js";
import { logger } from "../lib/logger";

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || "PLACEHOLDER_APP_ID";
const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY || "PLACEHOLDER_API_KEY";
const ADZUNA_REGION = process.env.ADZUNA_REGION || "in"; // Default to India

export async function fetchAndStoreJobs() {
  if (ADZUNA_APP_ID === "PLACEHOLDER_APP_ID") {
    logger.warn("Adzuna API credentials not configured. Skipping job sync.");
    return;
  }

  const searchTerms = ["Software Engineer", "Web Developer", "Data Scientist", "DevOps Engineer"];
  
  for (const term of searchTerms) {
    try {
      logger.info({ term }, "Fetching jobs from Adzuna");
      const url = `https://api.adzuna.com/v1/api/jobs/${ADZUNA_REGION}/search/1`;
      const response = await axios.get(url, {
        params: {
          app_id: ADZUNA_APP_ID,
          app_key: ADZUNA_API_KEY,
          results_per_page: 20,
          what: term,
          content_type: "application/json"
        }
      });

      const jobs = response.data.results;
      if (!Array.isArray(jobs)) continue;

      for (const job of jobs) {
        // Skill extraction heuristics from Adzuna (tags or description)
        const description = job.description || "";
        const skills = extractBasicSkills(description, term);

        const jobData: InsertJobListing = {
          title: job.title.replace(/<\/?[^>]+(>|$)/g, ""), // Clean HTML
          company: job.company.display_name,
          location: job.location.display_name,
          description: job.description,
          requiredSkills: skills,
          sourceUrl: job.redirect_url,
          domain: term,
          postedAt: job.created ? new Date(job.created) : new Date(),
          fetchedAt: new Date(),
          isActive: true
        };

        // Upsert logic (by sourceUrl)
        await db.insert(jobListingsTable).values(jobData).onDuplicateKeyUpdate({
           set: { fetchedAt: new Date() }
        });
      }
    } catch (error: any) {
      logger.error({ term, error: error.message }, "Failed to fetch jobs from Adzuna");
    }
  }
}

function extractBasicSkills(description: string, category: string): string[] {
  const commonSkills = ["React", "Node.js", "Python", "Java", "AWS", "Docker", "SQL", "JavaScript", "TypeScript", "HTML", "CSS", "Git", "Kubernetes", "Azure", "GCP", "C++", "C#", "Go", "Rust"];
  const descriptionLower = description.toLowerCase();
  const skills = commonSkills.filter(s => descriptionLower.includes(s.toLowerCase()));
  
  // Ensure some defaults based on category
  if (category.includes("Web") && !skills.includes("JavaScript")) skills.push("JavaScript");
  if (category.includes("Data") && !skills.includes("Python")) skills.push("Python");
  
  return Array.from(new Set(skills));
}
