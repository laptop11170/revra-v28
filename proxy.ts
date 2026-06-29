import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
 "/",
 "/sign-in",
 "/sign-in/(.*)",
 "/sign-up",
 "/sign-up/(.*)",
 "/select-workspace",
 "/api/webhooks/clerk(.*)",
 "/api/webhooks/sendillo(.*)",
 "/api/webhooks/stripe(.*)",
 "/api/webhooks/twilio(.*)",
 "/api/twiml(.*)",
 "/api/health(.*)",
]);

const proxy = clerkMiddleware(async (auth, req: NextRequest) => {
 const pathname = req.nextUrl.pathname;
 console.log(`[Proxy Log] Request path: ${pathname}`);

 // FIRST: Check if this is a public route - allow without auth
 if (isPublicRoute(req)) {
 console.log(`[Proxy Log] Public route: ${pathname}`);
 return NextResponse.next();
 }

 // NOT public - now check auth
 const { userId } = await auth();
 console.log(`[Proxy Log] Clerk userId: ${userId}`);

 if (!userId) {
 console.log(`[Proxy Log] No userId, redirecting to /sign-in`);
 return NextResponse.redirect(new URL("/sign-in", req.url));
 }

 const { createServiceSupabaseClient } = await import("@/lib/supabase/server");
 const supabase = createServiceSupabaseClient();

 if (!supabase) {
 console.log(`[Proxy Log] Supabase client not created`);
 return NextResponse.next();
 }

 const { data: user, error: dbError } = await supabase
 .from("users")
 .select("id, workspace_id, role")
 .eq("clerk_user_id", userId)
 .maybeSingle();

 if (dbError) {
 console.error(`[Proxy Log] Supabase user query error:`, dbError);
 }
 console.log(`[Proxy Log] Supabase user:`, user);

 const hasWorkspace = !!user?.workspace_id;
 const role = user?.role || "agent";
 console.log(`[Proxy Log] hasWorkspace: ${hasWorkspace}, role: ${role}`);

 // Redirect /select-workspace to dashboard if user already has a workspace
 if (pathname === "/select-workspace" && hasWorkspace) {
 const redirectTo = role === "superadmin" ? "/superadmin" : role === "admin" ? "/admin" : "/user";
 console.log(`[Proxy Log] Redirecting from /select-workspace to ${redirectTo}`);
 return NextResponse.redirect(new URL(redirectTo, req.url));
 }

 // No workspace — redirect to select-workspace
 if (!hasWorkspace && pathname !== "/select-workspace") {
 console.log(`[Proxy Log] No workspace, redirecting to /select-workspace`);
 return NextResponse.redirect(new URL("/select-workspace", req.url));
 }

 // Role-based route protection
 const isSuperAdmin = role === "superadmin";
 const isAdmin = role === "admin" || isSuperAdmin;

 if (pathname.startsWith("/superadmin") && !isSuperAdmin) {
 console.log(`[Proxy Log] Restricting non-superadmin from /superadmin, redirecting to /user`);
 return NextResponse.redirect(new URL("/user", req.url));
 }

 if (pathname.startsWith("/admin") && !isAdmin) {
 console.log(`[Proxy Log] Restricting non-admin from /admin, redirecting to /user`);
 return NextResponse.redirect(new URL("/user", req.url));
 }

 console.log(`[Proxy Log] Proceeding with next response for: ${pathname}`);
 return NextResponse.next();
});

export default proxy;

export const config = {
 matcher: [
 "/((?!.*\\..*|_next).*)",
 "/",
 "/(api|trpc)(.*)",
 ],
};
