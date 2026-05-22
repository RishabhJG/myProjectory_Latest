import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface PortfolioPDFData {
  user: {
    name: string;
    college?: string | null;
    degree?: string | null;
    graduationYear?: number | null;
    preferredDomain?: string | null;
    profilePhotoUrl?: string | null;
  };
  projects: Array<{
    id: number;
    title: string;
    description?: string | null;
    problemSolved?: string | null;
    technologies: string[];
    difficultyLevel: string;
    githubLink?: string | null;
    liveLink?: string | null;
    completionDate: string;
    role?: string | null;
  }>;
  skills: Array<{
    name: string;
    proficiencyLevel: string;
  }>;
  techStackSummary: Array<{
    name: string;
    projectCount: number;
  }>;
}

export async function generatePortfolioPDF(
  portfolioData: PortfolioPDFData,
  fileName: string = "portfolio.pdf"
): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  const setFont = (size: number, weight: "normal" | "bold" = "normal") => {
    doc.setFontSize(size);
    doc.setFont("helvetica", weight);
  };

  const addText = (text: string, x: number = margin) => {
    doc.text(text, x, yPosition);
  };

  const addMultilineText = (text: string, maxWidth: number = contentWidth) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, margin, yPosition);
    yPosition += lines.length * 5 + 3;
  };

  const checkPageBreak = (spaceNeeded: number = 10) => {
    if (yPosition + spaceNeeded > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // Header with user info
  setFont(24, "bold");
  addText(portfolioData.user.name);
  yPosition += 8;

  setFont(11, "normal");
  const userInfo = [
    portfolioData.user.college,
    portfolioData.user.degree,
    portfolioData.user.graduationYear ? `Class of ${portfolioData.user.graduationYear}` : null,
    portfolioData.user.preferredDomain,
  ]
    .filter(Boolean)
    .join(" • ");

  if (userInfo) {
    addText(userInfo);
    yPosition += 6;
  }

  yPosition += 4;

  // Tech Stack Summary
  if (portfolioData.techStackSummary.length > 0) {
    checkPageBreak(20);
    setFont(14, "bold");
    addText("Tech Stack Proficiency");
    yPosition += 7;

    setFont(10, "normal");
    const techText = portfolioData.techStackSummary
      .map((tech) => `${tech.name} (${tech.projectCount})`)
      .join(" • ");
    addMultilineText(techText, contentWidth);
    yPosition += 2;
  }

  // Skills Section
  if (portfolioData.skills.length > 0) {
    checkPageBreak(20);
    setFont(14, "bold");
    addText("Skills");
    yPosition += 7;

    setFont(10, "normal");
    portfolioData.skills.forEach((skill) => {
      const skillText = `${skill.name} - ${skill.proficiencyLevel}`;
      addText("• " + skillText);
      yPosition += 5;
    });
    yPosition += 2;
  }

  // Projects Section
  if (portfolioData.projects.length > 0) {
    checkPageBreak(15);
    setFont(14, "bold");
    addText(`Projects (${portfolioData.projects.length})`);
    yPosition += 7;

    portfolioData.projects.forEach((project, index) => {
      checkPageBreak(25);

      setFont(12, "bold");
      addText(`${index + 1}. ${project.title}`);
      yPosition += 6;

      setFont(9, "normal");
      if (project.description) {
        addMultilineText(project.description, contentWidth);
      }

      if (project.problemSolved) {
        setFont(9, "bold");
        addText("Problem Solved:");
        yPosition += 4;
        setFont(9, "normal");
        addMultilineText(project.problemSolved, contentWidth);
      }

      if (project.technologies.length > 0) {
        setFont(9, "bold");
        addText("Technologies:");
        yPosition += 4;
        setFont(9, "normal");
        const techLine = project.technologies.join(", ");
        addMultilineText(techLine, contentWidth);
      }

      const metadata = [
        project.difficultyLevel ? `Difficulty: ${project.difficultyLevel}` : null,
        project.role ? `Role: ${project.role}` : null,
      ]
        .filter(Boolean)
        .join(" • ");

      if (metadata) {
        setFont(8, "normal");
        addText(metadata);
        yPosition += 4;
      }

      yPosition += 3;
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${page} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      margin,
      pageHeight - 8
    );
  }

  // Save PDF
  doc.save(fileName);
}

export async function generatePortfolioPDFFromElement(
  elementId: string,
  fileName: string = "portfolio.pdf"
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  let clone: HTMLElement | null = null;

  try {
    // 1. Clone the element and place it off-screen to avoid React re-renders from resetting image sources
    clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = "absolute";
    clone.style.left = "-9999px";
    clone.style.top = "-9999px";
    clone.style.width = `${element.clientWidth}px`;
    clone.style.height = "auto";
    document.body.appendChild(clone);

    // 2. Pre-process images in the cloned element to base64
    const imgElements = Array.from(clone.querySelectorAll("img"));
    const fallbackTransparentPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    for (const img of imgElements) {
      if (img.src && !img.src.startsWith("data:") && !img.src.startsWith("blob:")) {
        try {
          const cacheBust = `nocache=${Date.now()}`;
          const srcUrl = img.src.includes("?") ? `${img.src}&${cacheBust}` : `${img.src}?${cacheBust}`;
          const response = await fetch(srcUrl, { mode: "cors" });
          if (response.ok) {
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            img.src = base64;
          } else {
            console.warn(`Failed to fetch image: status ${response.status}`, img.src);
            img.src = fallbackTransparentPng;
          }
        } catch (e) {
          console.warn("Failed to convert image to base64:", img.src, e);
          img.src = fallbackTransparentPng;
        }
      }
    }

    // 3. Wait for all base64 images inside the cloned element to be fully loaded
    const loadPromises = imgElements.map((img) => {
      if (!img.complete) {
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }
      return Promise.resolve();
    });
    await Promise.all(loadPromises);

    // 4. Generate the canvas from the cloned element
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const doc = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = doc.internal.pageSize.getWidth() - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const totalPages = Math.ceil(imgHeight / doc.internal.pageSize.getHeight());

    let heightLeft = imgHeight;
    let position = 0;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        doc.addPage();
      }

      doc.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= doc.internal.pageSize.getHeight();
      position -= doc.internal.pageSize.getHeight();
    }

    doc.save(fileName);
  } finally {
    // 5. Clean up: remove the cloned element from the DOM
    if (clone && clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }
  }
}
