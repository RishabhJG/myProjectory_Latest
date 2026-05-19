/**
 * Legacy route — superseded by PublicPortfolioPage in public-portfolio.tsx.
 * This file is kept as a redirect stub to prevent dead imports from causing build errors.
 */
import { useEffect } from "react";
import { useLocation, useParams } from "wouter";

export default function PortfolioSharePage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const token = (params as any)?.token || (params as any)?.shareId || "";

  useEffect(() => {
    if (token) {
      setLocation(`/portfolio/private/${token}`);
    } else {
      setLocation("/student-portfolios");
    }
  }, [token, setLocation]);

  return null;
}
