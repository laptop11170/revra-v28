// /user/texts — Merged into /user/conversations. This page now redirects.
import { redirect } from "next/navigation";

export default function TextsRedirect() {
  redirect("/user/conversations");
}