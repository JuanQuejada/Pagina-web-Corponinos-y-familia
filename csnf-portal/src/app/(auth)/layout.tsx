import AuthLayout from "@/components/auth/layouts/AuthLayout";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLayout>
      {children}
    </AuthLayout>
  );
}