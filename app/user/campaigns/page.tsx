import { redirect } from "next/navigation";

// /user/campaigns — Email is the default channel; SMS lives at /user/campaigns/sms.
export default function CampaignsIndex() {
 redirect("/user/campaigns/email");
}