import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { deletePost, listAdminPosts, savePost, type PostInput } from "@/lib/admin.functions";
import { formatDate, slugify } from "@/lib/format";
import { PermissionGate } from "@/lib/use-staff";

export const Route = createFileRoute("/_authenticated/admin/blog")({
  head: () => ({
    meta: [
      { title: "Blog | Universal Golden Homes Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BlogPage,
});

const EMPTY: PostInput = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image: "",
  category: "Market insights",
  author: "Universal Golden Homes",
  meta_title: "",
  meta_description: "",
  is_published: false,
};

function BlogManager() {
  const queryClient = useQueryClient();
  const fetchPosts = useServerFn(listAdminPosts);
  const persist = useServerFn(savePost);
  const remove = useServerFn(deletePost);
  const [editing, setEditing] = useState<PostInput | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: () => fetchPosts(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-posts"] });

  const saveMutation = useMutation({
    mutationFn: (input: PostInput) => persist({ data: input }),
    onSuccess: () => {
      toast.success("Post saved");
      setEditing(null);
      void invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Post deleted");
      void invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish market insights and buyer guides for the public blog.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="mr-2 h-4 w-4" /> New post
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : (posts ?? []).length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No blog posts yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {(posts ?? []).map((post) => (
            <li
              key={post.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{post.title}</p>
                  <Badge variant={post.is_published ? "secondary" : "outline"}>
                    {post.is_published ? "Published" : "Draft"}
                  </Badge>
                  {post.category ? <Badge variant="outline">{post.category}</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {post.author} · {formatDate(post.published_at)} · /blog/{post.slug}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setEditing(post)} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" title="Delete post">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete “{post.title}”?</AlertDialogTitle>
                      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(post.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <PostEditor
          value={editing}
          saving={saveMutation.isPending}
          onCancel={() => setEditing(null)}
          onSave={(input) => saveMutation.mutate(input)}
        />
      ) : null}
    </div>
  );
}

function PostEditor({
  value,
  saving,
  onCancel,
  onSave,
}: {
  value: PostInput;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: PostInput) => void;
}) {
  const [form, setForm] = useState<PostInput>(value);
  const set = <K extends keyof PostInput>(key: K, next: PostInput[K]) =>
    setForm((current) => ({ ...current, [key]: next }));

  return (
    <Dialog open onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit post" : "New post"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title ?? ""}
                onChange={(event) => {
                  const title = event.target.value;
                  setForm((current) => ({
                    ...current,
                    title,
                    slug: current.id ? (current.slug ?? "") : slugify(title),
                  }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={form.slug ?? ""} onChange={(e) => set("slug", slugify(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Excerpt</Label>
            <Textarea rows={2} value={form.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Content</Label>
            <Textarea rows={10} value={form.content ?? ""} onChange={(e) => set("content", e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Cover image URL</Label>
              <Input value={form.cover_image ?? ""} onChange={(e) => set("cover_image", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={form.category ?? ""} onChange={(e) => set("category", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Author</Label>
              <Input value={form.author ?? ""} onChange={(e) => set("author", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Meta title</Label>
              <Input value={form.meta_title ?? ""} onChange={(e) => set("meta_title", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Meta description</Label>
              <Input
                value={form.meta_description ?? ""}
                onChange={(e) => set("meta_description", e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={Boolean(form.is_published)}
              onCheckedChange={(next) => set("is_published", next)}
            />
            Published
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => onSave(form)}>
            {saving ? "Saving…" : "Save post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BlogPage() {
  return (
    <PermissionGate permission="blog">
      <BlogManager />
    </PermissionGate>
  );
}
