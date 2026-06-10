import DocNav from "@/components/doc/DocNav";
import DocHeading from "@/components/doc/DocHeading";

export const metadata = {
  title: "Documentation - VerShare",
  description:
    "VerShare docs: features, usage, API reference, CLI integration, and P2P mode.",
};

export default function DocLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <DocHeading />
      <DocNav />
      {children}
    </div>
  );
}
