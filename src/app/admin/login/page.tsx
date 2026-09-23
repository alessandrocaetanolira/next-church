import { redirect } from "next/navigation";

export default function PlatformAdminLoginPage() {
  redirect('/auth/login');
}
