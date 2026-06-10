import LoginForm from "@/components/admin/LoginForm";

export const metadata = { title: "Admin - VerShare" };

export default function AdminPage() {
  return (
    <div className="py-12">
      <LoginForm />
    </div>
  );
}
