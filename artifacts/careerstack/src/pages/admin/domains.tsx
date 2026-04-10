import { useState } from "react";
import { 
  useListDomains, 
  useCreateDomain, 
  useUpdateDomain, 
  useDeleteDomain 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Edit2, Plus, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminDomains() {
  const { data: domains, isLoading, refetch } = useListDomains();
  const createDomain = useCreateDomain();
  const updateDomain = useUpdateDomain();
  const deleteDomain = useDeleteDomain();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [categories, setCategories] = useState<string>("");
  const [roles, setRoles] = useState<string>("");
  const [skills, setSkills] = useState<string>("");

  const resetForm = () => {
    setName("");
    setDescription("");
    setPriority(0);
    setIsVisible(true);
    setCategories("");
    setRoles("");
    setSkills("");
    setEditingId(null);
  };

  const handleEdit = (domain: any) => {
    setEditingId(domain.id);
    setName(domain.name);
    setDescription(domain.description);
    setPriority(domain.priority);
    setIsVisible(domain.isVisible);
    setCategories(domain.categories?.join(", ") || "");
    setRoles(domain.roles?.join(", ") || "");
    setSkills(domain.skills?.join(", ") || "");
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      name,
      description,
      priority: Number(priority),
      isVisible,
      categories: categories.split(",").map((s) => s.trim()).filter(Boolean),
      roles: roles.split(",").map((s) => s.trim()).filter(Boolean),
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
    };

    try {
      if (editingId) {
        await updateDomain.mutateAsync({ id: editingId, data: payload });
        toast({ title: "Success", description: "Domain updated successfully" });
      } else {
        await createDomain.mutateAsync({ data: payload });
        toast({ title: "Success", description: "Domain created successfully" });
      }
      setIsDialogOpen(false);
      resetForm();
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Operation failed", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this domain?")) return;
    try {
      await deleteDomain.mutateAsync({ id });
      toast({ title: "Success", description: "Domain deleted successfully" });
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl flex items-center font-bold tracking-tight mb-2">
            <Terminal className="mr-3 text-primary" /> Global Domain Master
          </h1>
          <p className="text-muted-foreground">
            Manage industry domains, mapped skills, and role categories (Admin Only)
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Domain" : "Create New Domain"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Domain Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Software Engineering" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
              </div>
              <div className="flex space-x-4">
                <div className="space-y-2 flex-1">
                  <Label>Priority Rank</Label>
                  <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
                </div>
                <div className="space-y-2 flex flex-col justify-center">
                  <Label>Visible to Users?</Label>
                  <Switch checked={isVisible} onCheckedChange={setIsVisible} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categories (comma-separated)</Label>
                <Input value={categories} onChange={(e) => setCategories(e.target.value)} placeholder="e.g. Web Development, Data Science" />
              </div>
              <div className="space-y-2">
                <Label>Mapped Roles (comma-separated)</Label>
                <Input value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="e.g. Frontend Eng, Network Admin" />
              </div>
              <div className="space-y-2">
                <Label>Core Skills (comma-separated)</Label>
                <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. React, Node.js, Python, SQL" />
              </div>
              <Button onClick={handleSubmit} className="w-full mt-4" disabled={createDomain.isPending || updateDomain.isPending}>
                {editingId ? "Save Changes" : "Create Domain"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading && <p>Loading domains...</p>}
        {domains?.map((domain: any) => (
          <Card key={domain.id} className="glass border-border/50">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-xl">
                  {domain.name}
                  {!domain.isVisible && <Badge variant="secondary" className="ml-2">Hidden</Badge>}
                </CardTitle>
                <CardDescription className="mt-1">{domain.description}</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(domain)}>
                  <Edit2 className="w-4 h-4 text-blue-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(domain.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mt-2">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Roles ({domain.roles?.length || 0})</h4>
                  <div className="flex flex-wrap gap-1">
                    {domain.roles?.slice(0, 5).map((r: string) => (
                      <Badge key={r} variant="outline" className="text-xs font-normal">{r}</Badge>
                    ))}
                    {domain.roles?.length > 5 && <Badge variant="outline">+{domain.roles.length - 5} more</Badge>}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Skills ({domain.skills?.length || 0})</h4>
                  <div className="flex flex-wrap gap-1">
                    {domain.skills?.slice(0, 8).map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-xs font-normal">{s}</Badge>
                    ))}
                    {domain.skills?.length > 8 && <Badge variant="secondary">+{domain.skills.length - 8} more</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
