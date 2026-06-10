import CreatePanel from "@/components/create/CreatePanel";
import HomeHero from "@/components/shared/HomeHero";
import Workspace from "@/components/shared/Workspace";

export default function Home() {
  return (
    <Workspace>
      <div className="space-y-4 sm:space-y-6">
        <HomeHero />

        <CreatePanel />
      </div>
    </Workspace>
  );
}
