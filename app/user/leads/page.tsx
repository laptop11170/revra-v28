// /user/leads — Merged into /user/pipeline. This page now redirects.
import { redirect } from "next/navigation";

export default function LeadsRedirect() {
  redirect("/user/pipeline");
}