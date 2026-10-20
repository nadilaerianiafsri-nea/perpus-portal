import AdminPublicContentPage from "@/admin/AdminPublicContentPage";
import AdminSettingsPage from "@/admin/AdminSettingsPage";

export default function Page() {
  return (
    <>
      <AdminSettingsPage />
      <div style={{ marginTop: 24 }}>
        <AdminPublicContentPage />
      </div>
    </>
  );
}
