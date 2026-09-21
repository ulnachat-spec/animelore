import type { Metadata } from "next";
import { LibraryPage } from "@/components/library-page";

export const metadata: Metadata = { title: "我的书架" };

export default function Page() {
  return <LibraryPage />;
}
