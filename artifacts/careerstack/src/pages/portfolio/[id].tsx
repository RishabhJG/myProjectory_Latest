import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetProject, useCreateProject, useUpdateProject, useDeleteProject, getGetProjectQueryKey, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Plus, X, ChevronDown, Calendar, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PREDEFINED_CATEGORIES = [
  "Web App",
  "Mobile App",
  "Desktop App",
  "ML Model",
  "Data Analysis",
  "API",
  "Library",
  "CLI Tool",
  "Game",
  "Open Source",
  "Blockchain",
  "IoT",
].sort();

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters."),
  description: z.string().optional(),
  problemSolved: z.string().optional(),
  technologies: z.array(z.string()).min(1, "Add at least one technology."),
  difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]),
  completionStatus: z.enum(["planning", "in_progress", "completed"]),
  githubLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  liveLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  screenshotUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  duration: z.string().optional(),
  role: z.string().optional(),
  category: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Helper function to calculate duration in months
const calculateDuration = (startDate: string | undefined, endDate: string | undefined): string => {
  if (!startDate || !endDate) return "";
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return "";
    
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (months === 0) return "< 1 month";
    if (months === 1) return "1 month";
    return `${months} months`;
  } catch {
    return "";
  }
};

// Predefined list of popular technologies
const POPULAR_TECHNOLOGIES = [
  // Languages
  "Python", "JavaScript", "TypeScript", "Java", "C", "C++", "C#", "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin",
  // Frontend
  "React", "Vue.js", "Angular", "Svelte", "Next.js", "Nuxt.js", "HTML5", "CSS3", "Tailwind CSS", "Bootstrap",
  // Backend
  "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring Boot", "ASP.NET", "Laravel", "Ruby on Rails",
  // Databases
  "MongoDB", "PostgreSQL", "MySQL", "Redis", "Elasticsearch", "Firebase", "DynamoDB", "SQLite", "Cassandra",
  // DevOps & Tools
  "Docker", "Kubernetes", "AWS", "Azure", "Google Cloud", "Git", "GitHub", "GitLab", "CI/CD", "Jenkins",
  // Mobile
  "React Native", "Flutter", "Ionic", "Xamarin", "SwiftUI",
  // Other Tools
  "GraphQL", "REST API", "Microservices", "Serverless", "WebSockets", "TensorFlow", "PyTorch", "Machine Learning",
].sort();

export default function PortfolioDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = !params.id || params.id === "new";
  const projectId = isNew ? 0 : parseInt(params.id!);

  const { data: project, isLoading: loadingProject } = useGetProject(projectId, {
    query: { enabled: !isNew && !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const [techInput, setTechInput] = useState("");
  const [showTechDropdown, setShowTechDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      problemSolved: "",
      technologies: [],
      difficultyLevel: "intermediate",
      completionStatus: "in_progress",
      githubLink: "",
      liveLink: "",
      screenshotUrl: "",
      startDate: "",
      endDate: "",
      duration: "",
      role: "",
      category: "",
    },
  });

  useEffect(() => {
    if (project && !isNew) {
      form.reset({
        title: project.title,
        description: project.description || "",
        problemSolved: project.problemSolved || "",
        technologies: project.technologies || [],
        difficultyLevel: project.difficultyLevel,
        completionStatus: project.completionStatus,
        githubLink: project.githubLink || "",
        liveLink: project.liveLink || "",
        screenshotUrl: project.screenshotUrl || "",
        startDate: project.startDate ? project.startDate.substring(0, 7) : "",
        endDate: project.endDate ? project.endDate.substring(0, 7) : "",
        duration: project.duration || "",
        role: project.role || "",
        category: project.category || "",
      });
    }
  }, [project, isNew, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isNew) {
        await createMutation.mutateAsync({ data: values });
        toast({ title: "Success", description: "Project created successfully." });
      } else {
        await updateMutation.mutateAsync({ id: projectId, data: values });
        toast({ title: "Success", description: "Project updated successfully." });
      }
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      if (!isNew) {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      }
      setLocation("/portfolio");
    } catch (error) {
      console.error("Project save error:", error);
      toast({ title: "Error", description: "Failed to save project.", variant: "destructive" });
    }
  };

  const handleDeleteProject = async () => {
    try {
      await deleteMutation.mutateAsync({ id: projectId });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      toast({ title: "Success", description: "Project deleted successfully. Your readiness score has been updated." });
      setLocation("/portfolio");
    } catch (error) {
      console.error("Project delete error:", error);
      toast({ title: "Error", description: "Failed to delete project.", variant: "destructive" });
    }
  };

  const addTech = (tech?: string) => {
    const techToAdd = (tech || techInput).trim();
    const current = form.getValues("technologies");
    
    if (!techToAdd) return;

    // Find the canonical form from POPULAR_TECHNOLOGIES (case-insensitive match)
    const canonicalTech = POPULAR_TECHNOLOGIES.find(
      t => t.toLowerCase() === techToAdd.toLowerCase()
    );

    // Only allow adding if found in predefined list
    if (!canonicalTech) return;

    // Check if already exists (case-insensitive comparison)
    const alreadyExists = current.some(t => t.toLowerCase() === canonicalTech.toLowerCase());
    
    if (!alreadyExists) {
      form.setValue("technologies", [...current, canonicalTech], { shouldValidate: true });
      setTechInput("");
      setShowTechDropdown(false);
    }
  };

  const removeTech = (tech: string) => {
    const current = form.getValues("technologies");
    form.setValue("technologies", current.filter(t => t.toLowerCase() !== tech.toLowerCase()), { shouldValidate: true });
  };

  if (loadingProject && !isNew) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 mb-4" />
          <div className="text-muted-foreground">Loading project...</div>
        </div>
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/portfolio" className="inline-flex items-center justify-center rounded-xl p-2 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isNew ? "New Project" : "Edit Project"}</h1>
          <p className="text-muted-foreground">Detail your work to improve your portfolio score.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. MyProjectory" {...field} className="glass" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="What is this project about?" className="resize-none h-24 glass" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="problemSolved"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Problem Solved</FormLabel>
                        <FormDescription>Employers look for problem solvers. What specific issue did this fix?</FormDescription>
                        <FormControl>
                          <Textarea placeholder="e.g. Reduced data processing time by 40%..." className="resize-none h-24 glass" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="glass rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle>Technical Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium leading-none">Technologies Used</label>
                    <div className="flex gap-2 relative">
                      <div className="relative flex-1">
                        <Input 
                          value={techInput} 
                          onChange={(e) => {
                            setTechInput(e.target.value);
                            setShowTechDropdown(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const filtered = POPULAR_TECHNOLOGIES.filter(tech => 
                                !form.watch("technologies").includes(tech) &&
                                tech.toLowerCase().includes(techInput.toLowerCase())
                              );
                              if (filtered.length > 0) {
                                addTech(filtered[0]);
                              }
                            }
                          }}
                          onFocus={() => setShowTechDropdown(true)}
                          placeholder="Search or type a technology..."
                          className="glass pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTechDropdown(!showTechDropdown)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        
                        {/* Dropdown List */}
                        {showTechDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg">
                            <div className="max-h-60 overflow-y-auto">
                              {POPULAR_TECHNOLOGIES.filter(tech => 
                                !form.watch("technologies").includes(tech) &&
                                (techInput === "" || tech.toLowerCase().includes(techInput.toLowerCase()))
                              ).length > 0 ? (
                                POPULAR_TECHNOLOGIES.filter(tech => 
                                  !form.watch("technologies").includes(tech) &&
                                  (techInput === "" || tech.toLowerCase().includes(techInput.toLowerCase()))
                                ).map(tech => (
                                  <button
                                    key={tech}
                                    type="button"
                                    onClick={() => {
                                      addTech(tech);
                                      setTechInput("");
                                      setShowTechDropdown(false);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors text-sm"
                                  >
                                    {tech}
                                  </button>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                  No matching technologies
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <Button type="button" onClick={() => addTech()} variant="secondary">Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {form.watch("technologies").map(tech => (
                        <Badge key={tech} variant="secondary" className="pl-3 pr-1 py-1 flex items-center gap-1">
                          {tech}
                          <button type="button" onClick={() => removeTech(tech)} className="hover:bg-muted rounded-full p-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    {form.formState.errors.technologies && (
                      <p className="text-sm font-medium text-destructive">{form.formState.errors.technologies.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="difficultyLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="glass">
                                <SelectValue placeholder="Select difficulty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="completionStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="glass">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="planning">Planning</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle>Timeline & Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Month</FormLabel>
                          <FormControl>
                            <div className="relative flex items-center">
                              <Input 
                                type="month" 
                                {...field} 
                                className="glass pr-10" 
                                onChange={(e) => {
                                  field.onChange(e);
                                  const endDate = form.getValues("endDate");
                                  if (endDate) {
                                    const duration = calculateDuration(e.target.value, endDate);
                                    form.setValue("duration", duration);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                  if (input && typeof input.showPicker === 'function') {
                                    try {
                                      input.showPicker();
                                    } catch (err) {
                                      console.error("Failed to show picker:", err);
                                    }
                                  }
                                }}
                                className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              >
                                <Calendar className="w-4 h-4" />
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {form.watch("completionStatus") === "completed" && (
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Month</FormLabel>
                            <FormControl>
                              <div className="relative flex items-center">
                                <Input 
                                  type="month" 
                                  {...field} 
                                  className="glass pr-10"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    const startDate = form.getValues("startDate");
                                    if (startDate) {
                                      const duration = calculateDuration(startDate, e.target.value);
                                      form.setValue("duration", duration);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                    if (input && typeof input.showPicker === 'function') {
                                      try {
                                        input.showPicker();
                                      } catch (err) {
                                        console.error("Failed to show picker:", err);
                                      }
                                    }
                                  }}
                                  className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                >
                                  <Calendar className="w-4 h-4" />
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {form.watch("completionStatus") === "completed" && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium text-foreground">
                        {calculateDuration(form.watch("startDate"), form.watch("endDate")) || "—"}
                      </span>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Role</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Full Stack Developer" {...field} className="glass" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="glass">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PREDEFINED_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="glass rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle>Links & Media</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="githubLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GitHub Repository</FormLabel>
                        <FormControl>
                          <Input placeholder="https://github.com/..." {...field} className="glass" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="liveLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Live Demo</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} className="glass" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="screenshotUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Screenshot Image</FormLabel>
                        <FormDescription>Upload an image or provide a URL</FormDescription>
                        <FormControl>
                          <div className="space-y-3">
                            <Input 
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    field.onChange(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="glass cursor-pointer"
                            />
                            <div className="text-xs text-muted-foreground">Or paste URL:</div>
                            <Input 
                              placeholder="https://..." 
                              value={field.value} 
                              onChange={field.onChange}
                              className="glass" 
                            />
                            {field.value && (
                              <div className="mt-2">
                                <img 
                                  src={field.value} 
                                  alt="Screenshot preview" 
                                  className="w-full h-32 object-cover rounded-lg border border-border/50"
                                  onError={() => {
                                    // If image fails to load, clear it
                                    console.error("Failed to load image");
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 rounded-xl" disabled={isPending || deleteMutation.isPending}>
                  {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {isNew ? "Create Project" : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" className="flex-1 rounded-xl glass" onClick={() => setLocation("/portfolio")} disabled={isPending || deleteMutation.isPending}>
                  Cancel
                </Button>
                {!isNew && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    className="rounded-xl" 
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isPending || deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </Form>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 mt-4">
              <p>
                Are you sure you want to delete <strong>{project?.title}</strong>? This action cannot be undone.
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>⚠️ Note:</strong> Deleting this project will remove all associated technologies from your tech scores and may affect your job readiness score.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Confirm Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
