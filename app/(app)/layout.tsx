import { AppChrome } from "@/components/shell/AppChrome";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppChrome>{children}</AppChrome>;
}
