import { useEffect, useState } from "react";
import { useGetProfile, useUpdateProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  college: z.string().optional(),
  degree: z.string().optional(),
  graduationYear: z.coerce.number().min(2000).max(2100).optional().or(z.literal(0)),
  careerGoal: z.string().optional(),
  preferredDomain: z.string().optional(),
  interests: z.array(z.string()),
  skills: z.array(z.string()),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const { data: profile, isLoading } = useGetProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [skillInput, setSkillInput] = useState("");
  const [interestInput, setInterestInput] = useState("");

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      college: "",
      degree: "",
      graduationYear: undefined,
      careerGoal: "",
      preferredDomain: "",
      interests: [],
      skills: [],
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name,
        college: profile.college || "",
        degree: profile.degree || "",
        graduationYear: profile.graduationYear || undefined,
        careerGoal: profile.careerGoal || "",
        preferredDomain: profile.preferredDomain || "",
        interests: profile.interests || [],
        skills: profile.skills || [],
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      const dataToSubmit = {
        ...values,
        graduationYear: values.graduationYear ? Number(values.graduationYear) : undefined
      };
      
      await updateProfile.mutateAsync({ data: dataToSubmit });
      queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      toast({ title: "Success", description: "Profile updated successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    }
  };

  const addItem = (field: "skills" | "interests", input: string, setInput: (v: string) => void) => {
    const current = form.getValues(field);
    if (input.trim() && !current.includes(input.trim())) {
      form.setValue(field, [...current, input.trim()], { shouldValidate: true });
      setInput("");
    }
  };

  const removeItem = (field: "skills" | "interests", item: string) => {
    const current = form.getValues(field);
    form.setValue(field, current.filter(i => i !== item), { shouldValidate: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 mb-4" />
          <div className="text-muted-foreground">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your professional identity.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="glass rounded-2xl border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 pb-8 border-b border-border/50">
                <Avatar className="w-24 h-24 border-4 border-background shadow-md">
                  {profile?.profilePhotoUrl ? (
                    <AvatarImage src={profile.profilePhotoUrl} />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                      {profile?.name?.charAt(0).toUpperCase() || <UserIcon className="w-10 h-10" />}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-bold">{profile?.name || "User"}</h2>
                  <p className="text-muted-foreground">{profile?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="glass" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="careerGoal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Career Goal</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Senior Frontend Engineer" {...field} className="glass" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferredDomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Domain</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. FinTech, Healthcare" {...field} className="glass" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Education</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="college"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>College / University</FormLabel>
                      <FormControl>
                        <Input {...field} className="glass" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="degree"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Degree</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. B.S. Computer Science" {...field} className="glass" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="graduationYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Graduation Year</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ""} className="glass" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Skills & Interests</CardTitle>
              <CardDescription>This helps us tailor your job matches and readiness scores.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-3">
                <FormLabel>Technical Skills</FormLabel>
                <div className="flex gap-2">
                  <Input 
                    value={skillInput} 
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem("skills", skillInput, setSkillInput); } }}
                    placeholder="e.g. React, Python, AWS"
                    className="glass"
                  />
                  <Button type="button" onClick={() => addItem("skills", skillInput, setSkillInput)} variant="secondary">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.watch("skills").map(skill => (
                    <Badge key={skill} variant="default" className="pl-3 pr-1 py-1 flex items-center gap-1">
                      {skill}
                      <button type="button" onClick={() => removeItem("skills", skill)} className="hover:bg-primary-foreground/20 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <FormLabel>Interests</FormLabel>
                <div className="flex gap-2">
                  <Input 
                    value={interestInput} 
                    onChange={e => setInterestInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem("interests", interestInput, setInterestInput); } }}
                    placeholder="e.g. Machine Learning, UI/UX"
                    className="glass"
                  />
                  <Button type="button" onClick={() => addItem("interests", interestInput, setInterestInput)} variant="secondary">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.watch("interests").map(interest => (
                    <Badge key={interest} variant="secondary" className="pl-3 pr-1 py-1 flex items-center gap-1">
                      {interest}
                      <button type="button" onClick={() => removeItem("interests", interest)} className="hover:bg-muted rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" className="rounded-xl px-8 h-12" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Profile
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
