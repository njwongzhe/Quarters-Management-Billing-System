import { redirect } from "next/navigation";

import { ROUTES } from "@/app/constants/routes";

export default function PagesIndexPage() {
  redirect(ROUTES.lamanUtama);
}
