import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { UserDashboard } from "@/components/layouts/UserDashboard";

export default async function Home() {
 const { userId } = await auth();

 if (!userId) {
 redirect("/sign-in");
 }

 const supabase = createServiceSupabaseClient();
 if (!supabase) {
 redirect("/sign-in");
 }

 const { data: user, error: userError } = await supabase
 .from("users")
 .select("workspace_id, role")
 .eq("clerk_user_id", userId)
 .maybeSingle();

 if (userError) {
 console.error("[page /] users lookup error:", userError);
 redirect("/sign-in");
 }

 if (!user?.workspace_id) {
 redirect("/select-workspace");
 }

 // Render dashboard directly at "/"
 return <UserDashboard />;
}
