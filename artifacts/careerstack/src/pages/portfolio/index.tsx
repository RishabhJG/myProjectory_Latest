import { useState } from "react";
import { useListProjects, useDeleteProject, useListRoadmaps } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Plus, Github, Globe, ExternalLink, Trash2, Edit2, Briefcase, X, Award, Sparkles, Tag, Loader2, ExternalLink as LinkIcon } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  useListSkills,
  useAddSkill,
  useDeleteSkill,
  useListCertifications,
  useAddCertification,
  useDeleteCertification,
  useListProjectStackTags,
  useTagProjectToStack,
  useRemoveProjectStackTag,
  type ProjectStackTag,
} from "@/hooks/use-portfolio-api";

// ─── S2.5: Stack Tag Chips for a Project Card ─────────────────────────────────

function ProjectStackTags({ projectId }: { projectId: number }) {
  const { data: tags, isLoading: tagsLoading } = useListProjectStackTags(projectId);
  const { data: roadmaps } = useListRoadmaps();
  const tagMutation = useTagProjectToStack();
  const removeMutation = useRemoveProjectStackTag();
  const [showSelect, setShowSelect] = useState(false);

  const taggedStackIds = new Set(tags?.map((t) => t.stackId) || []);
  const availableRoadmaps = (roadmaps || []).filter((r) => !taggedStackIds.has(r.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {tagsLoading ? (
        <span className="text-xs text-muted-foreground">Loading tags...</span>
      ) : (
        <>
          {(tags || []).map((tag) => (
            <Badge key={tag.id} variant="secondary" className="pl-2 pr-0.5 py-0.5 flex items-center gap-1 text-xs bg-primary/10 text-primary border-primary/20">
              <Tag className="w-3 h-3" />
              {tag.technology}
              <button
                type="button"
                onClick={() => removeMutation.mutate({ projectId, tagId: tag.id })}
                className="hover:bg-primary/20 rounded-full p-0.5 ml-0.5 transition-colors"
                disabled={removeMutation.isPending}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {showSelect ? (
            <div className="flex items-center gap-1">
              <Select
                onValueChange={(val) => {
                  tagMutation.mutate({ projectId, stackId: parseInt(val) });
                  setShowSelect(false);
                }}
              >
                <SelectTrigger className="h-7 text-xs w-[140px] glass">
                  <SelectValue placeholder="Select stack..." />
                </SelectTrigger>
                <SelectContent>
                  {availableRoadmaps.length === 0 ? (
                    <SelectItem value="none" disabled>No stacks available</SelectItem>
                  ) : (
                    availableRoadmaps.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.technology}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <button type="button" onClick={() => setShowSelect(false)} className="p-0.5 hover:bg-muted rounded transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSelect(true)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary border border-dashed border-border/60 rounded-md px-2 py-0.5 transition-colors hover:border-primary/40"
            >
              <Tag className="w-3 h-3" />
              Tag Stack
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── S2.4: Skills Section ─────────────────────────────────────────────────────

function SkillsSection() {
  const { data: skills, isLoading } = useListSkills();
  const addSkill = useAddSkill();
  const deleteSkill = useDeleteSkill();
  const [skillName, setSkillName] = useState("");
  const [proficiency, setProficiency] = useState("beginner");

  const handleAddSkill = () => {
    if (!skillName.trim()) return;
    addSkill.mutate({ name: skillName.trim(), proficiencyLevel: proficiency }, {
      onSuccess: () => {
        setSkillName("");
        setProficiency("beginner");
      },
    });
  };

  const proficiencyColor: Record<string, string> = {
    beginner: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    intermediate: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    advanced: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    expert: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  };

  return (
    <Card className="glass rounded-2xl border-border/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Skills</CardTitle>
            <CardDescription>Add your technical skills with proficiency levels</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add skill form */}
        <div className="flex gap-2">
          <Input
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSkill(); } }}
            placeholder="e.g. React, Python, Docker"
            className="glass flex-1"
          />
          <Select value={proficiency} onValueChange={setProficiency}>
            <SelectTrigger className="w-[140px] glass">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAddSkill} disabled={addSkill.isPending || !skillName.trim()} variant="secondary">
            {addSkill.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>

        {/* Skill chips */}
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading skills...</div>
        ) : !skills || skills.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No skills added yet. Add your first skill above.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Badge
                  variant="outline"
                  className={`pl-3 pr-1 py-1.5 flex items-center gap-2 ${proficiencyColor[skill.proficiencyLevel] || ""}`}
                >
                  <span>{skill.name}</span>
                  <span className="text-[10px] uppercase opacity-70 font-semibold">{skill.proficiencyLevel}</span>
                  <button
                    type="button"
                    onClick={() => deleteSkill.mutate(skill.id)}
                    className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
                    disabled={deleteSkill.isPending}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── S2.4: Certifications Section ─────────────────────────────────────────────

function CertificationsSection() {
  const { data: certifications, isLoading } = useListCertifications();
  const addCert = useAddCertification();
  const deleteCert = useDeleteCertification();
  const [certName, setCertName] = useState("");
  const [issuingBody, setIssuingBody] = useState("");
  const [dateObtained, setDateObtained] = useState("");
  const [certUrl, setCertUrl] = useState("");

  const handleAddCert = () => {
    if (!certName.trim() || !issuingBody.trim()) return;
    addCert.mutate({
      name: certName.trim(),
      issuingBody: issuingBody.trim(),
      dateObtained: dateObtained || undefined,
      url: certUrl || undefined,
    }, {
      onSuccess: () => {
        setCertName("");
        setIssuingBody("");
        setDateObtained("");
        setCertUrl("");
      },
    });
  };

  return (
    <Card className="glass rounded-2xl border-border/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Certifications</CardTitle>
            <CardDescription>Add industry certifications to strengthen your profile</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add certification form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            value={certName}
            onChange={(e) => setCertName(e.target.value)}
            placeholder="Certification name"
            className="glass"
          />
          <Input
            value={issuingBody}
            onChange={(e) => setIssuingBody(e.target.value)}
            placeholder="Issuing body (e.g. AWS, Google)"
            className="glass"
          />
          <Input
            type="month"
            value={dateObtained}
            onChange={(e) => setDateObtained(e.target.value)}
            placeholder="Date obtained"
            className="glass"
          />
          <Input
            value={certUrl}
            onChange={(e) => setCertUrl(e.target.value)}
            placeholder="Verification URL (optional)"
            className="glass"
          />
        </div>
        <Button onClick={handleAddCert} disabled={addCert.isPending || !certName.trim() || !issuingBody.trim()} variant="secondary" className="w-full md:w-auto">
          {addCert.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Add Certification
        </Button>

        {/* Certification rows */}
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading certifications...</div>
        ) : !certifications || certifications.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No certifications added yet.</p>
        ) : (
          <div className="space-y-2 mt-2">
            {certifications.map((cert) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40 group hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-medium text-sm truncate">{cert.name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{cert.issuingBody}</span>
                    {cert.dateObtained && <span>· {cert.dateObtained}</span>}
                    {cert.url && (
                      <a href={cert.url} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 hover:text-primary transition-colors">
                        <ExternalLink className="w-3 h-3" /> Verify
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteCert.mutate(cert.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 rounded-lg transition-all text-muted-foreground hover:text-destructive"
                  disabled={deleteCert.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Portfolio Page ──────────────────────────────────────────────────────

export default function Portfolio() {
  const { data: projects, isLoading } = useListProjects();
  const deleteProject = useDeleteProject();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 mb-4" />
          <div className="text-muted-foreground">Loading portfolio...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground mt-1">Showcase your best work and technical depth.</p>
        </div>
        <Link href="/portfolio/new" className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 rounded-xl px-6">
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <Card className="glass rounded-2xl border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">No projects yet</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Your portfolio is the strongest signal to employers. Add your first project to start building your profile and readiness score.
            </p>
            <Link href="/portfolio/new" className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 rounded-xl px-6">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Project
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full flex flex-col glass rounded-2xl border-border/50 hover-elevate overflow-hidden">
                {project.screenshotUrl ? (
                  <div className="h-40 w-full bg-muted overflow-hidden">
                    <img src={project.screenshotUrl} alt={project.title} className="w-full h-full object-cover transition-transform hover:scale-105" />
                  </div>
                ) : (
                  <div className="h-32 w-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                    <Briefcase className="w-10 h-10 text-primary/40" />
                  </div>
                )}
                
                <CardHeader className="flex-1 pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl line-clamp-1" title={project.title}>
                      {project.title}
                    </CardTitle>
                    <Badge variant={project.completionStatus === 'completed' ? 'default' : 'secondary'} className="ml-2 shrink-0">
                      {project.completionStatus.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 mt-2">
                    {project.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pb-4">
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {project.technologies.slice(0, 3).map(tech => (
                      <Badge key={tech} variant="outline" className="bg-background/50">{tech}</Badge>
                    ))}
                    {project.technologies.length > 3 && (
                      <Badge variant="outline" className="bg-background/50">+{project.technologies.length - 3}</Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-3 text-sm text-muted-foreground">
                    {project.githubLink && (
                      <a href={project.githubLink} target="_blank" rel="noreferrer" className="flex items-center hover:text-foreground transition-colors">
                        <Github className="w-4 h-4 mr-1.5" /> Code
                      </a>
                    )}
                    {project.liveLink && (
                      <a href={project.liveLink} target="_blank" rel="noreferrer" className="flex items-center hover:text-foreground transition-colors">
                        <Globe className="w-4 h-4 mr-1.5" /> Live
                      </a>
                    )}
                  </div>

                  {/* S2.5: Stack Tags */}
                  <ProjectStackTags projectId={project.id} />
                </CardContent>
                
                <CardFooter className="pt-0 border-t border-border/50 bg-muted/20 flex justify-between p-4">
                  <span className="text-xs text-muted-foreground">
                    Updated {format(new Date(project.updatedAt), 'MMM d, yyyy')}
                  </span>
                  <div className="flex gap-2">
                    <Link href={`/portfolio/${project.id}`} className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 w-8 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* ─── S2.4: Skills & Certifications Sections ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkillsSection />
        <CertificationsSection />
      </div>
    </div>
  );
}
