import { db, jobListingsTable, type InsertJobListing } from "../lib/db/src";
import { logger } from "../artifacts/api-server/src/lib/logger";

async function main() {
  logger.info("Seeding mock job listings...");
  
  const mockJobs: InsertJobListing[] = [
    {
      title: "Senior Full Stack Engineer",
      company: "TechNova Solutions",
      location: "Remote / Bangalore",
      description: "We are looking for a rockstar developer with expertise in React, Node.js, and PostgreSQL. Join our fast-growing startup to build the future of fintech.",
      requiredSkills: ["React", "Node.js", "PostgreSQL", "TypeScript", "AWS"],
      sourceUrl: "https://example.com/jobs/1",
      domain: "Software Engineering",
      postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      fetchedAt: new Date(),
      isActive: true
    },
    {
      title: "Data Scientist (AI/ML)",
      company: "Innovate AI",
      location: "San Francisco / Remote",
      description: "Exciting opportunity to work on large-scale LLMs and production AI pipelines. Requires strong Python and PyTorch background.",
      requiredSkills: ["Python", "PyTorch", "LLM", "SQL", "Scikit-Learn"],
      sourceUrl: "https://example.com/jobs/2",
      domain: "Data Science",
      postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      fetchedAt: new Date(),
      isActive: true
    },
    {
      title: "DevOps Architect",
      company: "CloudScale Systems",
      location: "Berlin / Hybrid",
      description: "Help us scale our Kubernetes infrastructure. Deep knowledge of Terraform and Docker required.",
      requiredSkills: ["Kubernetes", "Docker", "Terraform", "Go", "GCP"],
      sourceUrl: "https://example.com/jobs/3",
      domain: "Software Engineering",
      postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      fetchedAt: new Date(),
      isActive: true
    },
    {
      title: "Frontend Lead (React)",
      company: "DesignCo",
      location: "Remote",
      description: "Lead the design system team at DesignCo. Expertise in TailwindCSS and Framer Motion essential.",
      requiredSkills: ["React", "TailwindCSS", "Framer Motion", "JavaScript"],
      sourceUrl: "https://example.com/jobs/4",
      domain: "Software Engineering",
      postedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      fetchedAt: new Date(),
      isActive: true
    }
  ];

  for (const job of mockJobs) {
    try {
      await db.insert(jobListingsTable).values(job).onConflictDoNothing();
      logger.info(`Inserted job: ${job.title}`);
    } catch (e) {
      logger.error(`Failed to insert job ${job.title}: ${e}`);
    }
  }

  logger.info("Seeding complete.");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
