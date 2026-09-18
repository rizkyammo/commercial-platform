import { getHomeDashboard } from "@/features/home/queries";
import { HomeClient } from "./home-client";

export default async function HomePage() {
  const data = await getHomeDashboard();
  return <HomeClient data={data} />;
}