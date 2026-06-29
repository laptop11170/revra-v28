"use client";

import { SignIn } from "@clerk/nextjs";
import { useTheme } from "@/context/theme-provider";

export default function SignInPage() {
 const { theme } = useTheme();
 const isDark = theme === "dark";

 return (
 <div
 style={{
 minHeight: "100vh",
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 background: isDark ? "#0A0F1C" : "#F8FAFC",
 transition: "background 0.2s ease",
 }}
 >
 <SignIn
 routing="path"
 path="/sign-in"
 signUpUrl="/sign-up"
 fallbackRedirectUrl="/select-workspace"
 appearance={{
 variables: {
 colorPrimary: "#6366F1",
 colorBackground: isDark ? "#131826" : "#ffffff",
 colorInputBackground: isDark ? "#161B2C" : "#ffffff",
 colorInputText: isDark ? "#F1F3F8" : "#0A0F1C",
 colorText: isDark ? "#F1F3F8" : "#0A0F1C",
 colorTextSecondary: isDark ? "#9CA3AF" : "#4B5563",
 colorBorder: isDark ? "#252B3F" : "#e2e8f0",
 borderRadius: "12px",
 },
 elements: {
 card: {
 boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
 border: isDark ? "1px solid #252B3F" : "1px solid #e2e8f0",
 },
 headerTitle: {
 color: isDark ? "#F1F3F8" : "#0A0F1C",
 },
 headerSubtitle: {
 color: isDark ? "#9CA3AF" : "#4B5563",
 },
 socialButtonsIconButton: {
 border: isDark ? "1px solid #252B3F" : "1px solid #e2e8f0",
 backgroundColor: isDark ? "#1A2034" : "#f8fafc",
 color: isDark ? "#F1F3F8" : "#0A0F1C",
 "&:hover": {
 backgroundColor: isDark ? "#2C334A" : "#f1f5f9",
 borderColor: "#6366F1",
 },
 },
 formButtonPrimary: {
 backgroundColor: "#6366F1",
 color: "#ffffff",
 "&:hover": {
 backgroundColor: "#4f46e5",
 }
 },
 footerActionText: {
 color: isDark ? "#9CA3AF" : "#4B5563",
 },
 footerActionLink: {
 color: "#818cf8",
 "&:hover": {
 color: "#6366F1",
 }
 },
 formFieldLabel: {
 color: isDark ? "#F1F3F8" : "#4B5563",
 },
 formFieldInput: {
 border: isDark ? "1px solid #252B3F" : "1px solid #cbd5e1",
 "&:focus": {
 borderColor: "#6366F1",
 }
 },
 }
 }}
 />
 </div>
 );
}
