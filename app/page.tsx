import { redirect } from "next/navigation";

import { ROUTES } from "@/app/constants/routes";

export default function HomePage() {
  redirect(ROUTES.lamanUtama);
}
